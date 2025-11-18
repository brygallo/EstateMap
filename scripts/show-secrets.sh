#!/bin/bash

# Script para mostrar los valores de los secrets necesarios para GitHub Actions
# Ejecutar este script EN EL SERVIDOR después de haber ejecutado quick-start-ip.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════╗"
echo "║   GitHub Actions Secrets - Valores Actuales   ║"
echo "╚════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Verificar que existe .env.ip
if [ ! -f ".env.ip" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env.ip no encontrado${NC}"
    echo "Por favor ejecuta primero: ./scripts/quick-start-ip.sh"
    exit 1
fi

# Cargar variables
source .env.ip

echo -e "${BLUE}📝 Copia estos valores a GitHub Secrets:${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""

# SERVER_IP
echo -e "${YELLOW}1. SERVER_IP${NC}"
echo "   Valor: ${GREEN}$SERVER_IP${NC}"
echo ""

# SERVER_USER
echo -e "${YELLOW}2. SERVER_USER${NC}"
echo "   Valor: ${GREEN}root${NC}"
echo ""

# DJANGO_SECRET_KEY
echo -e "${YELLOW}3. DJANGO_SECRET_KEY${NC}"
echo "   Valor: ${GREEN}$DJANGO_SECRET_KEY${NC}"
echo ""

# DB_PASSWORD
echo -e "${YELLOW}4. DB_PASSWORD${NC}"
echo "   Valor: ${GREEN}$DB_PASSWORD${NC}"
echo ""

# MINIO_ROOT_PASSWORD
echo -e "${YELLOW}5. MINIO_ROOT_PASSWORD${NC}"
echo "   Valor: ${GREEN}$MINIO_ROOT_PASSWORD${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""

# SSH_PRIVATE_KEY
echo -e "${YELLOW}6. SSH_PRIVATE_KEY${NC}"
echo "   Este valor debes generarlo en tu COMPUTADORA LOCAL"
echo ""
echo "   En tu computadora local ejecuta:"
echo -e "${BLUE}   ssh-keygen -t ed25519 -C \"github-actions-estatemap\"${NC}"
echo ""
echo "   Luego copia la clave pública al servidor:"
echo -e "${BLUE}   ssh-copy-id -i ~/.ssh/estatemap_deploy.pub root@$SERVER_IP${NC}"
echo ""
echo "   Y usa la clave PRIVADA para el secret:"
echo -e "${BLUE}   cat ~/.ssh/estatemap_deploy${NC}"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📖 Guía completa: GITHUB_ACTIONS_SETUP.md${NC}"
echo ""
echo -e "${GREEN}✅ Después de configurar los secrets en GitHub,${NC}"
echo -e "${GREEN}   cada push a main desplegará automáticamente!${NC}"
echo ""
