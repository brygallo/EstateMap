#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Verify .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod file not found!"
    echo "📝 Tip: Copy .env.prod.example to .env.prod and configure it"
    exit 1
fi

# Check if Google OAuth variables are configured
if ! grep -q "GOOGLE_CLIENT_ID=your-google-client-id" .env.prod 2>/dev/null; then
    echo "✅ Google OAuth variables appear to be configured"
else
    echo "⚠️  WARNING: Google OAuth variables still have default values!"
    echo "   Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.prod"
    echo "   See GOOGLE_OAUTH_SETUP.md for instructions"
    echo ""
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load environment variables
export $(cat .env.prod | grep -v '^#' | xargs)

echo "📥 Pulling latest changes..."
git pull origin main

echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

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
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Waiting for services to be ready..."
sleep 5

echo "📊 Services status:"
docker-compose -f docker-compose.prod.yml ps

echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=50

echo "✅ Deployment completed successfully!"

