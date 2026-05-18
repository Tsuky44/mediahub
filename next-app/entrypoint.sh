#!/bin/sh
# entrypoint.sh - MediaHub
# Drizzle gère désormais tout le DDL au démarrage (lib/db/drizzle.ts).
# On se contente d'assurer le répertoire et de démarrer le serveur.

set -e

echo "[entrypoint] Starting MediaHub..."
echo "[entrypoint] User: $(whoami) (ID: $(id -u))"
echo "[entrypoint] Cwd  : $(pwd)"

export DATABASE_URL=${DATABASE_URL:-"file:./data/db/dev.db"}
echo "[entrypoint] DATABASE_URL=$DATABASE_URL"

# S'assurer que le dossier de la DB existe (Drizzle créera le fichier)
mkdir -p ./data/db

DB_FILE="./data/db/dev.db"
if [ -f "$DB_FILE" ]; then
    echo "[entrypoint] DB file present:"
    ls -l "$DB_FILE"
else
    echo "[entrypoint] DB file absent — Drizzle l'initialisera au premier accès."
fi

echo "[entrypoint] Launching server..."
exec node server.js
