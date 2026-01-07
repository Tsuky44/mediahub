#!/bin/sh

# Appliquer les migrations Prisma
echo "Applying prisma migrations..."
npx prisma migrate deploy

# Démarrer l'application
echo "Starting application..."
node server.js
