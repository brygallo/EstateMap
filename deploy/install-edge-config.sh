#!/usr/bin/env bash
# Put the host's CDN-facing nginx configuration under version control.
#
# Three things have to exist on the box for the CDN not to break rate limiting
# (see deploy/nginx-cloudflare-realip.conf.example): the range list, an include
# of it inside the two geopropiedades server blocks, and a weekly job that
# refreshes the list. Installing them by hand once means the next rebuilt
# server silently loses them, so the deploy re-asserts them from the repo on
# every run.
#
# It is deliberately idempotent and deliberately non-fatal: a deploy must not
# fail because nginx is not on this machine or because the script is not root.
# Everything it does is additive, and it validates with `nginx -t` before any
# reload.

set -uo pipefail

SNIPPET=/etc/nginx/snippets/cloudflare-realip.conf
REFRESH=/usr/local/sbin/cloudflare-ips-refresh.sh
CRON=/etc/cron.d/cloudflare-ips
ZONES=/etc/nginx/conf.d/estatemap-ratelimit.conf
API_PROXY=/etc/nginx/snippets/estatemap-api-proxy.conf
API_LIMIT=/etc/nginx/snippets/estatemap-ratelimit-api.conf
API_VHOST=/etc/nginx/sites-available/geopropiedades-api.conf
VHOSTS=(
    /etc/nginx/sites-available/geopropiedades-frontend.conf
    /etc/nginx/sites-available/geopropiedades-api.conf
)
REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

skip() { echo "   ↷ edge config: $1"; exit 0; }

[ "$(id -u)" -eq 0 ] || skip "no root, se omite"
command -v nginx >/dev/null 2>&1 || skip "nginx no está en este host"

changed=0

# 1. The refresher, from the repo.
if [ ! -f "$REPO_DIR/cloudflare-ips-refresh.sh" ]; then
    skip "falta deploy/cloudflare-ips-refresh.sh en el checkout"
fi
if ! cmp -s "$REPO_DIR/cloudflare-ips-refresh.sh" "$REFRESH"; then
    if install -m 755 "$REPO_DIR/cloudflare-ips-refresh.sh" "$REFRESH"; then
        echo "   ✓ $REFRESH actualizado"
    else
        skip "no se pudo escribir $REFRESH"
    fi
fi

# 2. Its schedule. Monday 04:17 — off-peak and not on the hour, where every
#    other cron on the internet piles up.
if [ ! -f "$CRON" ] || ! grep -q "cloudflare-ips-refresh" "$CRON"; then
    printf '%s\n' '17 4 * * 1 root /usr/local/sbin/cloudflare-ips-refresh.sh' > "$CRON"
    chmod 644 "$CRON"
    echo "   ✓ $CRON instalado"
fi

# 3. The range list itself, if this host has never had one. The refresher both
#    writes it and validates it, so there is one code path for first install
#    and for the weekly update.
if [ ! -f "$SNIPPET" ]; then
    if "$REFRESH"; then
        echo "   ✓ $SNIPPET creado"
    else
        echo "   ⚠ no se pudo descargar la lista de rangos; nginx queda como estaba"
        exit 0
    fi
fi

# 4. The include, inside each geopropiedades server block and nowhere else.
#    This nginx also answers aents.net and miyomehabla.com, which are not
#    behind the CDN.
for vhost in "${VHOSTS[@]}"; do
    [ -f "$vhost" ] || continue
    grep -q "cloudflare-realip.conf" "$vhost" && continue
    if ! grep -q "client_max_body_size" "$vhost"; then
        echo "   ⚠ $vhost no tiene el ancla esperada; incluir el snippet a mano"
        continue
    fi
    cp -a "$vhost" "$vhost.bak"
    sed -i "0,/client_max_body_size/s//include ${SNIPPET//\//\\/};\n\n    client_max_body_size/" "$vhost"
    if nginx -t >/dev/null 2>&1; then
        changed=1
        echo "   ✓ include añadido en $(basename "$vhost")"
    else
        mv "$vhost.bak" "$vhost"
        echo "   ⚠ nginx rechazó el include en $(basename "$vhost"); revertido"
    fi
done

# 5. Rate limiting. The zones go in `http` (inert until a server block spends
#    one) and the limit itself in a snippet the API vhost includes, so the
#    certbot-managed file gains exactly one line. The frontend vhost gets no
#    limit on purpose: it serves the pages that have to be crawled.
for pair in \
    "nginx-ratelimit-zones.conf:$ZONES" \
    "nginx-api-proxy.conf:$API_PROXY" \
    "nginx-ratelimit-api.conf:$API_LIMIT"
do
    src="$REPO_DIR/${pair%%:*}"
    dst="${pair##*:}"
    [ -f "$src" ] || continue
    cmp -s "$src" "$dst" && continue
    cp -a "$dst" "$dst.bak" 2>/dev/null || true
    install -m 644 "$src" "$dst"
    if nginx -t >/dev/null 2>&1; then
        changed=1
        echo "   ✓ $(basename "$dst") actualizado"
    else
        if [ -f "$dst.bak" ]; then mv "$dst.bak" "$dst"; else rm -f "$dst"; fi
        echo "   ⚠ nginx rechazó $(basename "$dst"); revertido"
    fi
done

if [ -f "$API_VHOST" ] && [ -f "$API_LIMIT" ] && ! grep -q "estatemap-ratelimit-api.conf" "$API_VHOST"; then
    if grep -q "cloudflare-realip.conf" "$API_VHOST"; then
        cp -a "$API_VHOST" "$API_VHOST.bak"
        sed -i "0,/cloudflare-realip.conf;/s//cloudflare-realip.conf;\n    include ${API_LIMIT//\//\\/};/" "$API_VHOST"
        if nginx -t >/dev/null 2>&1; then
            changed=1
            echo "   ✓ límite de tasa activado en la API"
        else
            mv "$API_VHOST.bak" "$API_VHOST"
            echo "   ⚠ nginx rechazó el límite de tasa; revertido"
        fi
    else
        echo "   ⚠ $API_VHOST sin el ancla esperada; incluir el límite a mano"
    fi
fi

if [ "$changed" -eq 1 ] && nginx -t >/dev/null 2>&1; then
    systemctl reload nginx && echo "   ✓ nginx recargado"
fi

exit 0
