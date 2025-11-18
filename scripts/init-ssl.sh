#!/bin/bash

# Script to initialize SSL certificates with Let's Encrypt
# Run this ONCE after initial server setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 Initializing SSL certificates...${NC}"

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production file not found${NC}"
    echo "Please create it from .env.production.example"
    exit 1
fi

# Load environment variables
source .env.production

# Check required variables
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Error: DOMAIN not set in .env.production${NC}"
    exit 1
fi

echo -e "${YELLOW}📝 Domain: $DOMAIN${NC}"
echo -e "${YELLOW}📝 Creating temporary nginx config for certificate request...${NC}"

# Create temporary nginx config for HTTP only (for Let's Encrypt validation)
cat > nginx/conf.d/estatemap-temp.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "OK";
        add_header Content-Type text/plain;
    }
}
EOF

# Replace ${DOMAIN} with actual domain
sed -i.bak "s/\${DOMAIN}/$DOMAIN/g" nginx/conf.d/estatemap-temp.conf
rm nginx/conf.d/estatemap-temp.conf.bak

# Rename the main config temporarily
if [ -f nginx/conf.d/estatemap.conf ]; then
    mv nginx/conf.d/estatemap.conf nginx/conf.d/estatemap.conf.backup
fi

echo -e "${YELLOW}🚀 Starting nginx with HTTP only...${NC}"
docker-compose -f docker-compose.prod.yml up -d nginx

echo -e "${YELLOW}⏳ Waiting for nginx to start...${NC}"
sleep 5

echo -e "${YELLOW}📜 Requesting SSL certificate from Let's Encrypt...${NC}"
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate obtained successfully!${NC}"

    # Restore the full nginx config
    rm nginx/conf.d/estatemap-temp.conf
    if [ -f nginx/conf.d/estatemap.conf.backup ]; then
        mv nginx/conf.d/estatemap.conf.backup nginx/conf.d/estatemap.conf
    fi

    # Replace ${DOMAIN} in the main config
    sed -i.bak "s/\${DOMAIN}/$DOMAIN/g" nginx/conf.d/estatemap.conf
    rm nginx/conf.d/estatemap.conf.bak

    echo -e "${YELLOW}♻️  Restarting nginx with HTTPS...${NC}"
    docker-compose -f docker-compose.prod.yml restart nginx

    echo -e "${GREEN}🎉 SSL setup complete!${NC}"
    echo -e "${GREEN}🌐 Your site should now be available at: https://$DOMAIN${NC}"
else
    echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    echo -e "${YELLOW}💡 Make sure:${NC}"
    echo "   1. Your domain DNS points to this server's IP"
    echo "   2. Ports 80 and 443 are open in your firewall"
    echo "   3. No other service is using port 80"
    exit 1
fi
