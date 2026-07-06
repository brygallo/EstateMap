# frontend/Dockerfile (dev)
FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias primero
COPY package.json package-lock.json* ./

# Instalar dependencias de forma reproducible
RUN npm ci --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Exponer puerto de Next.js
EXPOSE 3000

# Comando por defecto (puede ser sobrescrito por docker-compose)
CMD ["npm", "run", "dev"]
