#!/bin/sh
set -e

# Configuration des permissions (exécuté en tant que root au démarrage du conteneur)
echo "[Start] Configuring permissions..."

# Création du dossier de données s'il n'existe pas
mkdir -p /app/data

# Si nous sommes root, on donne la propriété du dossier data à l'utilisateur nextjs (UID 1001)
if [ "$(id -u)" = "0" ]; then
    echo "[Start] Fixing ownership of /app/data..."
    chown -R 1001:1001 /app/data
    chown -R 1001:1001 /app/prisma
fi

# Exécution des migrations et démarrage du serveur en tant que l'utilisateur nextjs
# On utilise su-exec ou runuser selon la disponibilité, mais ici on est sur Debian donc runuser
echo "[Start] Switching to user nextjs for migration and startup..."

# On exécute tout le bloc suivant en tant que nextjs pour garantir que tous les fichiers créés (DB, logs) lui appartiennent
exec runuser -u nextjs -- sh -c '
    echo "[User] Running Prisma migrations..."
    npx prisma migrate deploy
    
    echo "[User] Starting Next.js server..."
    node server.js
'
