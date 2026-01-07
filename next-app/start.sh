#!/bin/sh

# S'assurer que le dossier prisma appartient à l'utilisateur courant et est accessible en écriture
# Note: Dans Docker, l'utilisateur nextjs a l'UID 1001
echo "Setting permissions for database..."
# On vérifie si on est root pour pouvoir changer les permissions
if [ "$(id -u)" = "0" ]; then
    chown -R 1001:1001 /app/prisma
fi
chmod -R 777 /app/prisma

# Appliquer les migrations Prisma
echo "Applying prisma migrations..."
npx prisma migrate deploy

# Démarrer l'application en tant qu'utilisateur nextjs
echo "Starting application as nextjs..."
exec runuser -u nextjs -- node server.js
