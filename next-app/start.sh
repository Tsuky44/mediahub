#!/bin/sh

# S'assurer que les dossiers nécessaires existent et ont les bonnes permissions
echo "Setting permissions for database and data directory..."
if [ "$(id -u)" = "0" ]; then
    mkdir -p /app/data
    chown -R 1001:1001 /app/prisma
    chown -R 1001:1001 /app/data
fi
chmod -R 777 /app/prisma
chmod -R 777 /app/data

# Appliquer les migrations Prisma
echo "Applying prisma migrations..."
npx prisma migrate deploy

# Démarrer l'application en tant qu'utilisateur nextjs
echo "Starting application as nextjs..."
exec runuser -u nextjs -- node server.js
