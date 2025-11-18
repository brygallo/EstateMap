#!/bin/bash

# Initial server setup script for Ubuntu/Debian
# Run this ONCE on a fresh Contabo server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Setting up server for EstateMap...${NC}"

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
sudo apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Install Docker
echo -e "${YELLOW}🐳 Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Install Docker Compose
echo -e "${YELLOW}🐳 Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo -e "${GREEN}✅ Firewall configured${NC}"

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
sudo mkdir -p /var/www/estatemap
sudo chown -R $USER:$USER /var/www/estatemap
echo -e "${GREEN}✅ Directory created: /var/www/estatemap${NC}"

# Configure swap (if not exists)
if [ ! -f /swapfile ]; then
    echo -e "${YELLOW}💾 Creating swap file (2GB)...${NC}"
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo -e "${GREEN}✅ Swap file created${NC}"
else
    echo -e "${GREEN}✅ Swap file already exists${NC}"
fi

# Enable Docker to start on boot
echo -e "${YELLOW}🔄 Enabling Docker to start on boot...${NC}"
sudo systemctl enable docker

echo -e "${GREEN}✅ Server setup complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Logout and login again for Docker group to take effect"
echo "2. Clone your repository to /var/www/estatemap"
echo "3. Configure environment variables"
echo "4. Run the SSL initialization script"
echo "5. Set up GitHub Actions secrets"
echo ""
echo -e "${GREEN}🎉 Server is ready for deployment!${NC}"
