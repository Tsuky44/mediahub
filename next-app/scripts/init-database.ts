#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { join } from 'path';

// Chemin vers la base de données
const DB_PATH = join(process.cwd(), 'data', 'db', 'dev.db');

function main() {
  console.log('🔧 Initializing database schema...');
  
  try {
    // Créer le répertoire de la base de données s'il n'existe pas
    const dbDir = join(process.cwd(), 'data', 'db');
    require('fs').mkdirSync(dbDir, { recursive: true });
    
    const db = new Database(DB_PATH);
    
    console.log('📋 Creating tables if they do not exist...');
    
    // 1. Table settings
    db.exec(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT,
        "category" TEXT DEFAULT 'general' NOT NULL,
        "created_at" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL
      );
    `);
    
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_unique" ON "settings" ("key");
    `);
    
    // 2. Table notification_events
    db.exec(`
      CREATE TABLE IF NOT EXISTS "notification_events" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "request_id" INTEGER,
        "tmdb_id" TEXT NOT NULL,
        "media_type" TEXT NOT NULL,
        "event" TEXT NOT NULL,
        "correlation_id" TEXT NOT NULL,
        "payload" TEXT NOT NULL,
        "status" TEXT DEFAULT 'pending' NOT NULL,
        "dedup_key" TEXT NOT NULL UNIQUE,
        "created_at" INTEGER NOT NULL,
        "dispatched_at" INTEGER
      );
    `);
    
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_dedup_key_unique" ON "notification_events" ("dedup_key");
      CREATE INDEX IF NOT EXISTS "notification_events_request_event_idx" ON "notification_events" ("request_id", "event");
      CREATE INDEX IF NOT EXISTS "notification_events_status_created_idx" ON "notification_events" ("status", "created_at");
      CREATE INDEX IF NOT EXISTS "notification_events_tmdb_type_idx" ON "notification_events" ("tmdb_id", "media_type");
    `);
    
    // 3. Table notification_deliveries
    db.exec(`
      CREATE TABLE IF NOT EXISTS "notification_deliveries" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "event_id" INTEGER NOT NULL,
        "recipient" TEXT NOT NULL,
        "provider" TEXT DEFAULT 'evolution' NOT NULL,
        "status" TEXT DEFAULT 'pending' NOT NULL,
        "attempts" INTEGER DEFAULT 0 NOT NULL,
        "last_error" TEXT,
        "sent_at" INTEGER,
        "next_retry_at" INTEGER,
        "created_at" INTEGER NOT NULL,
        FOREIGN KEY ("event_id") REFERENCES "notification_events" ("id") ON DELETE CASCADE
      );
    `);
    
    db.exec(`
      CREATE INDEX IF NOT EXISTS "notification_deliveries_event_id_idx" ON "notification_deliveries" ("event_id");
      CREATE INDEX IF NOT EXISTS "notification_deliveries_status_retry_idx" ON "notification_deliveries" ("status", "next_retry_at");
    `);
    
    // 4. Ajouter les colonnes manquantes dans la table users
    console.log('📋 Adding missing columns to users table...');
    
    const columnsToAdd = [
      { name: 'email_verified', sql: 'INTEGER' },
      { name: 'discord_user_id', sql: 'TEXT' },
      { name: 'discord_webhook', sql: 'TEXT' },
      { name: 'custom_webhook', sql: 'TEXT' },
      { name: 'whatsapp_number', sql: 'TEXT' }
    ];
    
    // Vérifier les colonnes existantes
    const tableInfo = db.prepare(`PRAGMA table_info(users)`).all() as any[];
    
    for (const column of columnsToAdd) {
      const exists = tableInfo.some(col => col.name === column.name);
      if (!exists) {
        try {
          db.exec(`ALTER TABLE users ADD COLUMN ${column.name} ${column.sql};`);
          console.log(`✅ Added ${column.name} column`);
        } catch (error) {
          console.log(`⚠️  Could not add ${column.name}: ${error}`);
        }
      }
    }
    
    db.close();
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
