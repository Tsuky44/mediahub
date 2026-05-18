Write-Host "🔧 Fixing production database schema on server..." -ForegroundColor Cyan

# Vérifier si le container mediahub-app est en cours d'exécution
$container = docker ps -q -f "name=mediahub-app"
if (-not $container) {
    Write-Error "❌ Container mediahub-app not found. Make sure it's running."
    exit 1
}

Write-Host "📋 Creating missing tables and columns..." -ForegroundColor Yellow

# 1. Créer la table settings si elle n'existe pas
Write-Host "🔍 Creating settings table..." -ForegroundColor Yellow
docker exec $container sqlite3 /app/data/db/dev.db "CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT NOT NULL UNIQUE, value TEXT, category TEXT DEFAULT 'general' NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);"

# 2. Créer l'index unique pour settings
Write-Host "📊 Creating settings index..." -ForegroundColor Yellow
docker exec $container sqlite3 /app/data/db/dev.db "CREATE UNIQUE INDEX IF NOT EXISTS settings_key_unique ON settings (key);"

# 3. Créer la table notification_deliveries si elle n'existe pas
Write-Host "📋 Creating notification_deliveries table..." -ForegroundColor Yellow
docker exec $container sqlite3 /app/data/db/dev.db "CREATE TABLE IF NOT EXISTS notification_deliveries (id INTEGER PRIMARY KEY AUTOINCREMENT, event_id INTEGER NOT NULL, recipient TEXT NOT NULL, provider TEXT DEFAULT 'evolution' NOT NULL, status TEXT DEFAULT 'pending' NOT NULL, attempts INTEGER DEFAULT 0 NOT NULL, last_error TEXT, sent_at INTEGER, next_retry_at INTEGER, created_at INTEGER NOT NULL);"

# 4. Créer les indexes pour notification_deliveries
Write-Host "📊 Creating notification_deliveries indexes..." -ForegroundColor Yellow
docker exec $container sqlite3 /app/data/db/dev.db "CREATE INDEX IF NOT EXISTS notification_deliveries_event_id_idx ON notification_deliveries (event_id);"
docker exec $container sqlite3 /app/data/db/dev.db "CREATE INDEX IF NOT EXISTS notification_deliveries_status_retry_idx ON notification_deliveries (status, next_retry_at);"

# 5. Créer la table notification_events si elle n'existe pas
Write-Host "📋 Creating notification_events table..." -ForegroundColor Yellow
docker exec $container sqlite3 /app/data/db/dev.db "CREATE TABLE IF NOT EXISTS notification_events (id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER, tmdb_id TEXT NOT NULL, media_type TEXT NOT NULL, event TEXT NOT NULL, correlation_id TEXT NOT NULL, payload TEXT NOT NULL, status TEXT DEFAULT 'pending' NOT NULL, dedup_key TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, dispatched_at INTEGER);"

# 6. Créer les indexes pour notification_events
Write-Host "📊 Creating notification_events indexes..." -ForegroundColor Yellow
docker exec $container sqlite3 /app/data/db/dev.db "CREATE UNIQUE INDEX IF NOT EXISTS notification_events_dedup_key_unique ON notification_events (dedup_key);"
docker exec $container sqlite3 /app/data/db/dev.db "CREATE INDEX IF NOT EXISTS notification_events_request_event_idx ON notification_events (request_id, event);"
docker exec $container sqlite3 /app/data/db/dev.db "CREATE INDEX IF NOT EXISTS notification_events_status_created_idx ON notification_events (status, created_at);"
docker exec $container sqlite3 /app/data/db/dev.db "CREATE INDEX IF NOT EXISTS notification_events_tmdb_type_idx ON notification_events (tmdb_id, media_type);"

# 7. Ajouter les colonnes manquantes dans la table users
Write-Host "📋 Adding missing columns to users table..." -ForegroundColor Yellow

# Liste des colonnes à ajouter
$columns = @(
    "email_verified INTEGER",
    "discord_user_id TEXT",
    "discord_webhook TEXT",
    "custom_webhook TEXT",
    "whatsapp_number TEXT"
)

foreach ($column in $columns) {
    $columnName = ($column -split ' ')[0]
    Write-Host "  Adding $columnName column..." -ForegroundColor Gray
    try {
        docker exec $container sqlite3 /app/data/db/dev.db "ALTER TABLE users ADD COLUMN $column;" 2>$null
    } catch {
        Write-Host "    $columnName already exists" -ForegroundColor Gray
    }
}

Write-Host "✅ Database schema fixed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Restarting the container to apply changes..." -ForegroundColor Yellow
docker restart $container

Write-Host "🎉 Production database fixed and container restarted!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Wait 30 seconds for the container to fully restart"
Write-Host "2. Check the application logs: docker logs mediahub-app --tail 50"
Write-Host "3. Access your application"
Write-Host ""
Write-Host "If you still see errors, run this script again or check the database manually." -ForegroundColor Yellow
