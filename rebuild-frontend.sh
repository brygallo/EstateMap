#!/bin/bash

# Script para reconstruir el frontend de Next.js en Docker

echo "🧹 Limpiando contenedores y volúmenes..."
docker-compose down -v

echo "🗑️  Eliminando imagen antigua del frontend..."
docker rmi estatemap_frontend 2>/dev/null || echo "   (No había imagen anterior)"

echo "🔨 Reconstruyendo imagen del frontend (esto puede tardar unos minutos)..."
docker-compose build --no-cache frontend

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build exitoso!"
    echo ""
    echo "🚀 Iniciando servicios..."
    docker-compose up
else
    echo ""
    echo "❌ Error en el build. Revisa los mensajes arriba."
    exit 1
fi
