#!/bin/bash
set -e

echo "🚀 EstateMap - Despliegue"
echo ""

# Verificar que existe .env.ip
if [ ! -f ".env.ip" ]; then
    echo "📝 Creando archivo .env.ip..."

    # Detectar IP
    SERVER_IP=$(curl -s ifconfig.me || echo "")
    if [ -z "$SERVER_IP" ]; then
        read -p "Ingresa la IP pública del servidor: " SERVER_IP
    fi

    # Generar secrets
    echo "🔐 Generando contraseñas seguras..."
    DJANGO_SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    MINIO_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    cat > .env.ip << EOF
SERVER_IP=$SERVER_IP
DJANGO_SECRET_KEY=$DJANGO_SECRET_KEY
DB_PASSWORD=$DB_PASSWORD
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
EOF

    echo "✅ Archivo .env.ip creado"
fi

# Cargar variables
export $(cat .env.ip | grep -v '^#' | xargs)

# Build y up
echo "🏗️  Construyendo servicios..."
docker-compose -f docker-compose.ip.yml build

echo "🚀 Iniciando servicios..."
docker-compose -f docker-compose.ip.yml up -d

echo "⏳ Esperando que los servicios inicien..."
sleep 20

echo ""
echo "✅ Despliegue completado"
echo ""
echo "🌐 Tu aplicación está en: http://$SERVER_IP/"
echo "🔑 Admin: http://$SERVER_IP/admin/"
echo ""
echo "Para crear un superusuario:"
echo "  docker-compose -f docker-compose.ip.yml exec backend python manage.py createsuperuser"
echo ""
