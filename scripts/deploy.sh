#!/bin/bash

# Manual deployment script
# Use this for manual deployments or when GitHub Actions is not working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Starting deployment...${NC}"

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.prod.yml not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Backup database
echo -e "${YELLOW}📦 Creating database backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U postgres estatemap > "$BACKUP_FILE" 2>/dev/null || echo "No database to backup (first deployment?)"
if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
fi

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
git pull origin main

# Build images
echo -e "${YELLOW}🏗️  Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

# Stop services
echo -e "${YELLOW}⏹️  Stopping services...${NC}"
docker-compose -f docker-compose.prod.yml down

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Run migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput

# Collect static files
echo -e "${YELLOW}📦 Collecting static files...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

# Clean up old Docker images
echo -e "${YELLOW}🧹 Cleaning up old Docker images...${NC}"
docker image prune -af

# Show service status
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}📊 Container status:${NC}"
docker-compose -f docker-compose.prod.yml ps

# Health check
echo -e "${YELLOW}🏥 Running health checks...${NC}"
sleep 5

# Check backend health
if docker-compose -f docker-compose.prod.yml exec -T backend curl -f http://localhost:8000/api/properties/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
fi

# Check nginx
if docker-compose -f docker-compose.prod.yml exec -T nginx wget --quiet --tries=1 --spider http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx is healthy${NC}"
else
    echo -e "${RED}❌ Nginx health check failed${NC}"
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
