#!/bin/bash
set -e

echo "🔧 Setting up server for EstateMap..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (sudo)${NC}"
    exit 1
fi

# Update system
echo -e "${BLUE}📦 Updating system...${NC}"
apt update && apt upgrade -y

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}🐳 Installing Docker...${NC}"

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Start Docker service
systemctl enable docker
systemctl start docker

# Add current user to docker group (if not root)
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker "$SUDO_USER"
    echo -e "${GREEN}✅ User $SUDO_USER added to docker group${NC}"
    echo -e "${BLUE}⚠️  Please logout and login again for group changes to take effect${NC}"
fi

# Install Docker Compose (standalone)
if ! command -v docker-compose &> /dev/null; then
    echo -e "${BLUE}🔧 Installing Docker Compose...${NC}"
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Configure firewall
echo -e "${BLUE}🔥 Configuring firewall...${NC}"
apt install -y ufw
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9001/tcp  # MinIO Console
echo -e "${GREEN}✅ Firewall configured${NC}"

# Show versions
echo ""
echo -e "${GREEN}✅ Server setup completed!${NC}"
echo ""
echo -e "${BLUE}📊 Installed versions:${NC}"
docker --version
docker-compose --version
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "   1. Clone your repository:"
echo "      git clone https://github.com/YOUR_USERNAME/EstateMap.git /var/www/estatemap"
echo ""
echo "   2. Deploy the application:"
echo "      cd /var/www/estatemap"
echo "      ./scripts/deploy.sh"
echo ""
