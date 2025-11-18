#!/bin/bash

# Quick Start Script - Deployment con IP
# Ejecutar esto después de clonar el repo en el servidor

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔════════════════════════════════════════╗"
echo "║   EstateMap - Quick Start con IP      ║"
echo "╚════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar Docker
echo -e "${YELLOW}🔍 Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo "Ejecuta primero: ./scripts/server-setup.sh"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    echo "Ejecuta primero: ./scripts/server-setup.sh"
    exit 1
fi

echo -e "${GREEN}✅ Docker instalado${NC}"

# Verificar si existe .env.ip
if [ -f ".env.ip" ]; then
    echo -e "${YELLOW}⚠️  .env.ip ya existe${NC}"
    read -p "¿Quieres sobreescribirlo? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${BLUE}ℹ️  Usando .env.ip existente${NC}"
    else
        rm .env.ip
    fi
fi

# Crear .env.ip si no existe
if [ ! -f ".env.ip" ]; then
    echo -e "${YELLOW}📝 Creando archivo .env.ip...${NC}"

    # Obtener IP del servidor
    SERVER_IP=$(curl -s ifconfig.me || echo "")
    if [ -z "$SERVER_IP" ]; then
        echo -e "${YELLOW}No se pudo detectar la IP automáticamente${NC}"
        read -p "Ingresa la IP pública de este servidor: " SERVER_IP
    else
        echo -e "${GREEN}IP detectada: $SERVER_IP${NC}"
        read -p "¿Es correcta esta IP? (S/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            read -p "Ingresa la IP pública de este servidor: " SERVER_IP
        fi
    fi

    # Generar Django Secret Key
    echo -e "${YELLOW}🔐 Generando Django Secret Key...${NC}"
    DJANGO_SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')

    # Generar contraseñas
    echo -e "${YELLOW}🔐 Generando contraseñas seguras...${NC}"
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    # Crear archivo .env.ip
    cat > .env.ip << EOF
# EstateMap - Configuración con IP
# Generado automáticamente el $(date)

SERVER_IP=$SERVER_IP
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
DB_PASSWORD=$DB_PASSWORD
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
EOF

    echo -e "${GREEN}✅ Archivo .env.ip creado${NC}"
    echo -e "${BLUE}ℹ️  Las credenciales han sido generadas automáticamente${NC}"
fi

# Cargar variables
export $(cat .env.ip | grep -v '^#' | xargs)

echo ""
echo -e "${YELLOW}🏗️  Construyendo e iniciando servicios...${NC}"
echo "Esto puede tomar 5-10 minutos la primera vez"
echo ""

# Build y up
docker-compose -f docker-compose.ip.yml build
docker-compose -f docker-compose.ip.yml up -d

# Esperar a que los servicios estén listos
echo -e "${YELLOW}⏳ Esperando que los servicios inicien...${NC}"
sleep 20

# Verificar estado
echo -e "${YELLOW}📊 Estado de servicios:${NC}"
docker-compose -f docker-compose.ip.yml ps

# Preguntar si crear superusuario
echo ""
echo -e "${YELLOW}👤 ¿Quieres crear un superusuario de Django ahora?${NC}"
read -p "(s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    docker-compose -f docker-compose.ip.yml exec backend python manage.py createsuperuser
fi

# Mensaje final
echo ""
echo -e "${GREEN}═════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ¡Deployment completado exitosamente!${NC}"
echo -e "${GREEN}═════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 Tu aplicación está disponible en:${NC}"
echo -e "${GREEN}   http://$SERVER_IP/${NC}"
echo ""
echo -e "${BLUE}🔑 Panel de administración:${NC}"
echo -e "${GREEN}   http://$SERVER_IP/admin/${NC}"
echo ""
echo -e "${BLUE}📡 API:${NC}"
echo -e "${GREEN}   http://$SERVER_IP/api/properties/${NC}"
echo ""
echo -e "${YELLOW}💡 Comandos útiles:${NC}"
echo "   Ver logs:       docker-compose -f docker-compose.ip.yml logs -f"
echo "   Reiniciar:      docker-compose -f docker-compose.ip.yml restart"
echo "   Detener:        docker-compose -f docker-compose.ip.yml down"
echo "   Actualizar:     ./scripts/deploy-ip.sh"
echo ""
echo -e "${BLUE}📖 Documentación completa: DEPLOYMENT_IP.md${NC}"
echo ""
