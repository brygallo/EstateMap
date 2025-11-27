#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Verify .env.prod exists
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod file not found!"
    exit 1
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

