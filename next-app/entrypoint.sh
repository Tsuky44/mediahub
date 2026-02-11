#!/bin/sh
# entrypoint.sh

echo "Running Prisma migrations..."
# Tente de lancer la migration. Si prisma n'est pas trouvé, on l'installe temporairement ou on suppose qu'il est dans le path global
npx prisma migrate deploy

echo "Starting application..."
exec node server.js
