#!/bin/bash

echo "🔧 Fixing production database schema in Docker container..."

# Entrer dans le container et exécuter le script de fix
docker exec -it mediahub-app-1 npx tsx scripts/fix-production-db.ts

echo "✅ Database fix completed!"
echo "🔄 Restarting the container to apply changes..."

# Redémarrer le container pour s'assurer que les changements sont pris en compte
docker restart mediahub-app-1

echo "🎉 Production database fixed and container restarted!"
