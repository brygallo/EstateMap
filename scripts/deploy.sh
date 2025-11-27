#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Load environment variables
export $(cat .env.prod | grep -v '^#' | xargs)

echo "📥 Pulling latest changes..."
git pull origin main

echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo "🔨 Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py migrate

echo "📦 Collecting static files..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --noinput

echo "🚀 Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "📊 Services status:"
docker-compose -f docker-compose.prod.yml ps

echo "📋 Recent logs:"
docker-compose -f docker-compose.prod.yml logs --tail=30

echo "✅ Deployment completed successfully!"
