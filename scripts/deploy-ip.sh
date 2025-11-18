#!/bin/bash

# Script de deployment para configuración con IP (sin SSL)
# Usar este script cuando NO tienes dominio

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Iniciando deployment con IP...${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.ip.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.ip.yml no encontrado${NC}"
    echo "Por favor ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar que existe .env.ip
if [ ! -f ".env.ip" ]; then
    echo -e "${RED}❌ Error: .env.ip no encontrado${NC}"
    echo "Por favor crea el archivo .env.ip desde .env.ip.example"
    exit 1
fi

# Cargar variables de entorno
echo -e "${YELLOW}📝 Cargando variables de entorno...${NC}"
export $(cat .env.ip | grep -v '^#' | xargs)

# Backup de base de datos
echo -e "${YELLOW}📦 Creando backup de base de datos...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker-compose -f docker-compose.ip.yml exec -T db pg_dump -U postgres estatemap > "$BACKUP_FILE" 2>/dev/null || echo "No hay base de datos para backup (primer deployment?)"

if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"
fi

# Pull de últimos cambios
echo -e "${YELLOW}📥 Descargando últimos cambios...${NC}"
git pull origin main

# Construir imágenes
echo -e "${YELLOW}🏗️  Construyendo imágenes Docker...${NC}"
docker-compose -f docker-compose.ip.yml build --no-cache

# Detener servicios
echo -e "${YELLOW}⏹️  Deteniendo servicios...${NC}"
docker-compose -f docker-compose.ip.yml down

# Iniciar servicios
echo -e "${YELLOW}🚀 Iniciando servicios...${NC}"
docker-compose -f docker-compose.ip.yml up -d

# Esperar a que los servicios estén listos
echo -e "${YELLOW}⏳ Esperando que los servicios inicien...${NC}"
sleep 15

# Ejecutar migraciones
echo -e "${YELLOW}🗄️  Ejecutando migraciones...${NC}"
docker-compose -f docker-compose.ip.yml exec -T backend python manage.py migrate --noinput

# Collectstatic
echo -e "${YELLOW}📦 Recolectando archivos estáticos...${NC}"
docker-compose -f docker-compose.ip.yml exec -T backend python manage.py collectstatic --noinput

# Limpiar imágenes antiguas
echo -e "${YELLOW}🧹 Limpiando imágenes Docker antiguas...${NC}"
docker image prune -af || true

# Mostrar estado
echo -e "${GREEN}✅ Deployment completado!${NC}"
echo -e "${GREEN}📊 Estado de contenedores:${NC}"
docker-compose -f docker-compose.ip.yml ps

# Health check
echo -e "${YELLOW}🏥 Verificando salud de servicios...${NC}"
sleep 5

# Verificar backend
if docker-compose -f docker-compose.ip.yml exec -T backend curl -f http://localhost:8000/api/properties/ > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend está funcionando${NC}"
else
    echo -e "${RED}❌ Backend no responde${NC}"
fi

# Verificar nginx
if docker-compose -f docker-compose.ip.yml exec -T nginx wget --quiet --tries=1 --spider http://localhost/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Nginx está funcionando${NC}"
else
    echo -e "${RED}❌ Nginx no responde${NC}"
fi

echo -e "${GREEN}🎉 Deployment completo!${NC}"
echo ""
echo -e "${GREEN}🌐 Tu aplicación está disponible en:${NC}"
echo -e "${GREEN}   http://$SERVER_IP/${NC}"
echo ""
echo -e "${YELLOW}💡 Comandos útiles:${NC}"
echo "   Ver logs:       docker-compose -f docker-compose.ip.yml logs -f"
echo "   Reiniciar:      docker-compose -f docker-compose.ip.yml restart"
echo "   Detener:        docker-compose -f docker-compose.ip.yml down"
