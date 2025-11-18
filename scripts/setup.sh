#!/bin/bash
set -e

echo "🚀 EstateMap - Instalación Inicial"
echo ""

# Instalar Docker si no existe
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker instalado"
    echo "⚠️  Debes salir y volver a entrar por SSH para que tome efecto"
    exit 0
fi

# Instalar Docker Compose si no existe
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado"
fi

# Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Obtener IP
SERVER_IP=$(curl -s ifconfig.me)
echo ""
echo "✅ Servidor configurado"
echo "📍 IP del servidor: $SERVER_IP"
echo ""
echo "Siguiente paso: Clona el repositorio y ejecuta ./scripts/deploy.sh"
