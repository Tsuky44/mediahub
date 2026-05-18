#!/bin/bash

echo "🔧 Fixing production database schema on server..."

# Vérifier si le container mediahub-app est en cours d'exécution
if ! docker ps | grep -q "mediahub-app"; then
    echo "❌ Container mediahub-app not found. Make sure it's running."
    exit 1
fi

echo "📋 Creating missing tables and columns..."

# 1. Créer la table settings si elle n'existe pas
echo "🔍 Creating settings table..."
docker exec mediahub-app sqlite3 /app/data/db/dev.db "
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    category TEXT DEFAULT 'general' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
"

# 2. Créer l'index unique pour settings
echo "📊 Creating settings index..."
docker exec mediahub-app sqlite3 /app/data/db/dev.db "
CREATE UNIQUE INDEX IF NOT EXISTS settings_key_unique ON settings (key);
"

# 3. Créer la table notification_deliveries si elle n'existe pas
echo "📋 Creating notification_deliveries table..."
docker exec mediahub-app sqlite3 /app/data/db/dev.db "
CREATE TABLE IF NOT EXISTS notification_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    recipient TEXT NOT NULL,
    provider TEXT DEFAULT 'evolution' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    last_error TEXT,
    sent_at INTEGER,
    next_retry_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (event_id) REFERENCES notification_events (id) ON DELETE CASCADE
);
"

# 4. Créer les indexes pour notification_deliveries
echo "📊 Creating notification_deliveries indexes..."
docker exec mediahub-app sqlite3 /app/data/db/dev.db "
CREATE INDEX IF NOT EXISTS notification_deliveries_event_id_idx ON notification_deliveries (event_id);
CREATE INDEX IF NOT EXISTS notification_deliveries_status_retry_idx ON notification_deliveries (status, next_retry_at);
"

# 5. Créer la table notification_events si elle n'existe pas
echo "📋 Creating notification_events table..."
docker exec mediahub-app sqlite3 /app/data/db/dev.db "
CREATE TABLE IF NOT EXISTS notification_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    tmdb_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    event TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    dedup_key TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    dispatched_at INTEGER,
    FOREIGN KEY (request_id) REFERENCES media_requests (id) ON DELETE SET NULL
);
"

# 6. Créer les indexes pour notification_events
echo "📊 Creating notification_events indexes..."
docker exec mediahub-app sqlite3 /app/data/db/dev.db "
CREATE UNIQUE INDEX IF NOT EXISTS notification_events_dedup_key_unique ON notification_events (dedup_key);
CREATE INDEX IF NOT EXISTS notification_events_request_event_idx ON notification_events (request_id, event);
CREATE INDEX IF NOT EXISTS notification_events_status_created_idx ON notification_events (status, created_at);
CREATE INDEX IF NOT EXISTS notification_events_tmdb_type_idx ON notification_events (tmdb_id, media_type);
"

# 7. Ajouter les colonnes manquantes dans la table users
echo "📋 Adding missing columns to users table..."

# Liste des colonnes à ajouter
declare -a columns=(
    "email_verified INTEGER"
    "discord_user_id TEXT"
    "discord_webhook TEXT"
    "custom_webhook TEXT"
    "whatsapp_number TEXT"
)

for column in "${columns[@]}"; do
    column_name=$(echo $column | cut -d' ' -f1)
    echo "  Adding $column_name column..."
    docker exec mediahub-app sqlite3 /app/data/db/dev.db "
    BEGIN;
    ALTER TABLE users ADD COLUMN $column;
    COMMIT;
    " 2>/dev/null || echo "    $column_name already exists"
done

echo "✅ Database schema fixed successfully!"
echo ""
echo "🔄 Restarting the container to apply changes..."
docker restart mediahub-app

echo "🎉 Production database fixed and container restarted!"
echo ""
echo "📋 Next steps:"
echo "1. Wait 30 seconds for the container to fully restart"
echo "2. Check the application logs: docker logs mediahub-app --tail 50"
echo "3. Access your application"
echo ""
echo "If you still see errors, run this script again or check the database manually."
