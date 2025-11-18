#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Detect server IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
echo -e "${BLUE}📍 Server IP: $SERVER_IP${NC}"

# Load or create .env file
ENV_FILE=".env.prod"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${BLUE}📝 Creating $ENV_FILE...${NC}"

    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    DJANGO_SECRET=$(openssl rand -base64 50 | tr -d "=+/" | cut -c1-50)

    cat > "$ENV_FILE" << EOF
# Database
DB_PASSWORD=$DB_PASSWORD

# MinIO
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD

# Django
DJANGO_SECRET_KEY=$DJANGO_SECRET
ALLOWED_HOSTS=$SERVER_IP,localhost,127.0.0.1

# Server
SERVER_IP=$SERVER_IP
EOF

    echo -e "${GREEN}✅ Environment file created!${NC}"
    echo -e "${BLUE}📋 Save these credentials:${NC}"
    cat "$ENV_FILE"
else
    echo -e "${GREEN}✅ Using existing $ENV_FILE${NC}"
fi

# Load environment variables
export $(cat "$ENV_FILE" | xargs)

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true

# Build and start services
echo -e "${BLUE}🔨 Building and starting services...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 10

# Create MinIO bucket
echo -e "${BLUE}📦 Creating MinIO bucket...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python -c "
from minio import Minio
import os

client = Minio(
    os.getenv('MINIO_ENDPOINT'),
    access_key=os.getenv('MINIO_ACCESS_KEY'),
    secret_key=os.getenv('MINIO_SECRET_KEY'),
    secure=False
)

bucket = os.getenv('MINIO_BUCKET_NAME', 'estatemap')
if not client.bucket_exists(bucket):
    client.make_bucket(bucket)
    print(f'Bucket {bucket} created')
else:
    print(f'Bucket {bucket} already exists')
" || echo "MinIO bucket creation skipped"

# Show status
echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${BLUE}📊 Services status:${NC}"
docker-compose -f docker-compose.prod.yml ps
echo ""
echo -e "${BLUE}🌐 Access your application:${NC}"
echo -e "   Frontend: http://$SERVER_IP"
echo -e "   Backend API: http://$SERVER_IP/api/"
echo -e "   Admin: http://$SERVER_IP/admin/"
echo -e "   MinIO Console: http://$SERVER_IP:9001 (admin / $MINIO_ROOT_PASSWORD)"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo -e "   1. Create superuser: docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo -e "   2. Configure nginx as reverse proxy (see nginx/estatemap.conf.example)"
echo ""
