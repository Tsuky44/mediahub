#!/bin/sh
set -e

echo "[Start] Starting MediaHub container..."

# Run migrations directly
# Using the default user defined in Dockerfile or current user
echo "[Start] Running Prisma migrations..."
# Force database creation if it doesn't exist
npx prisma migrate deploy

echo "[Start] Starting Next.js server..."
exec node server.js
