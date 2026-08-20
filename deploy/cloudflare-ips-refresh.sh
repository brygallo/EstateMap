#!/usr/bin/env bash
# Keep /etc/nginx/snippets/cloudflare-realip.conf current.
#
# A stale range fails closed, not open: visitors arriving from an edge this
# file does not list get identified by the edge address instead of their own,
# and start sharing a throttle bucket with strangers. Cloudflare changes the
# list rarely, which is exactly why nobody remembers to check it by hand.
#
# Install on the prod host:
#   install -m 755 deploy/cloudflare-ips-refresh.sh /usr/local/sbin/
#   printf '%s\n' '17 4 * * 1 root /usr/local/sbin/cloudflare-ips-refresh.sh' \
#     > /etc/cron.d/cloudflare-ips
#
# It only reloads nginx when the list actually changed, and it refuses to
# install a list it could not download or that nginx rejects.

set -euo pipefail

TARGET=/etc/nginx/snippets/cloudflare-realip.conf
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT

fetch() {
    curl -fsS --max-time 20 "$1"
    echo
}

{
    echo "# Cloudflare real client IP - generated $(date -u +%F) from cloudflare.com/ips-v4 and -v6"
    { fetch https://www.cloudflare.com/ips-v4; fetch https://www.cloudflare.com/ips-v6; } \
        | grep -E '^[0-9a-fA-F:.]+/[0-9]+$' \
        | awk '{print "set_real_ip_from " $0 ";"}'
    echo "real_ip_header CF-Connecting-IP;"
    echo "real_ip_recursive on;"
} > "$TMP"

# An empty or truncated download would silently un-trust the CDN.
ranges=$(grep -c '^set_real_ip_from' "$TMP" || true)
if [ "$ranges" -lt 15 ]; then
    echo "cloudflare-ips-refresh: only $ranges ranges downloaded, refusing to install" >&2
    exit 1
fi

if [ -f "$TARGET" ] && diff -q <(grep -v '^#' "$TARGET") <(grep -v '^#' "$TMP") >/dev/null; then
    exit 0
fi

cp -a "$TARGET" "$TARGET.bak" 2>/dev/null || true
install -m 644 "$TMP" "$TARGET"

if ! nginx -t 2>/dev/null; then
    echo "cloudflare-ips-refresh: nginx rejected the new list, rolling back" >&2
    [ -f "$TARGET.bak" ] && mv "$TARGET.bak" "$TARGET"
    exit 1
fi

systemctl reload nginx
echo "cloudflare-ips-refresh: $ranges ranges installed, nginx reloaded"
