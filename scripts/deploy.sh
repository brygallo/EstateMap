#!/bin/bash
# pipefail matters here: several steps pipe a manage.py command into `tail`,
# and without it the pipeline reports tail's exit code, hiding the failure.
set -eo pipefail

# The braces wrap the whole script on purpose. This file rewrites itself
# halfway through (`git reset --hard` below pulls the new release), and bash
# reads a script incrementally: without the group, execution would continue at
# a byte offset inside the *new* file and silently skip or repeat steps. A
# compound command is parsed in full before it runs, so the version that
# started the deploy is the version that finishes it.
{

echo "🚀 Starting deployment..."

# Verify .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "📝 Tip: Copy .env.prod.example to .env.prod and configure it"
    exit 1
fi

# Fail before touching the current release when required production settings
# are absent or still contain template values.
required_vars=(
    DJANGO_SECRET_KEY ALLOWED_HOSTS CORS_ALLOWED_ORIGINS
    CSRF_TRUSTED_ORIGINS DB_HOST DB_USER DB_PASSWORD DB_NAME
    MINIO_ENDPOINT MINIO_ACCESS_KEY MINIO_SECRET_KEY MINIO_BUCKET_NAME
    NEXT_PUBLIC_API_URL NEXT_PUBLIC_FRONTEND_URL FRONTEND_URL REVALIDATE_SECRET
)
for var_name in "${required_vars[@]}"; do
    value=$(grep -E "^${var_name}=" .env.prod | tail -1 | cut -d= -f2-)
    if [ -z "$value" ] || [[ "$value" == *"your_"* ]] || [[ "$value" == *"replace_with"* ]] || [[ "$value" == *"tu-dominio"* ]]; then
        echo "❌ Variable de producción ausente o inválida: ${var_name}"
        exit 1
    fi
done

if ! grep -qx 'DEBUG=False' .env.prod; then
    echo "❌ DEBUG=False es obligatorio en producción"
    exit 1
fi

# Check if Google OAuth variables are configured
if ! grep -q "GOOGLE_CLIENT_ID=your-google-client-id" .env.prod 2>/dev/null; then
    echo "✅ Google OAuth variables appear to be configured"
else
    echo "⚠️  WARNING: Google OAuth variables still have default values!"
    echo "   Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.prod"
    echo "   See docs/workflows/google-oauth.md for instructions"
    echo ""
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load environment variables. Values containing spaces or shell metacharacters
# must be quoted in .env.prod.
set -a
source .env.prod
set +a

echo "📥 Pulling latest changes..."
# Use fetch + reset instead of pull: idempotent, avoids merge conflicts from
# local changes and self-heals stale/corrupted remote-tracking refs on the server.
git remote prune origin || true
if ! git fetch origin main; then
    echo "⚠️  Fetch failed, attempting to repair git refs..."
    git gc --prune=now || true
    rm -f .git/refs/remotes/origin/main
    git fetch origin main
fi
git reset --hard origin/main

echo "🔨 Building Docker images while the current services stay online..."
# Keep the running containers available during the slow part of the deploy.
# Docker's layer cache also avoids reinstalling unchanged Python/Node packages.
docker-compose -f docker-compose.prod.yml build

echo "🔐 Validating production configuration..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py check --deploy
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py makemigrations --check --dry-run

echo "🔍 Checking pending migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend \
    python manage.py showmigrations --plan | tail -20

echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend \
    python manage.py migrate --verbosity 2

echo "📦 Collecting static files..."
docker-compose -f docker-compose.prod.yml run --rm backend \
    python manage.py collectstatic --noinput --verbosity 2

echo "🚀 Starting services..."
# Recreate only the services whose image/configuration changed. Do not run
# `down`: that would turn the whole build and migration time into downtime.
docker-compose -f docker-compose.prod.yml up -d --remove-orphans

echo "⏳ Waiting for services to be healthy..."
for attempt in $(seq 1 24); do
    backend_health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' estatemap_backend 2>/dev/null || true)
    frontend_health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' estatemap_frontend 2>/dev/null || true)
    if [ "$backend_health" = "healthy" ] && [ "$frontend_health" = "healthy" ]; then
        break
    fi
    if [ "$attempt" -eq 24 ]; then
        echo "❌ Services did not become healthy (backend=${backend_health}, frontend=${frontend_health})"
        docker-compose -f docker-compose.prod.yml logs --tail=100
        exit 1
    fi
    sleep 5
done

curl --fail --silent --show-error -H 'X-Forwarded-Proto: https' http://127.0.0.1:8000/api/health/ >/dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/robots.txt >/dev/null

echo "📊 Services status:"
docker-compose -f docker-compose.prod.yml ps

echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=50

echo "✅ Deployment completed successfully!"

}
