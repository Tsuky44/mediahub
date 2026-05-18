#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

// Chemin vers la base de données en production (à adapter selon votre configuration)
const DB_PATH = join(process.cwd(), 'data', 'db', 'dev.db');

function main() {
  console.log('🔧 Fixing SQLite database schema directly...');
  
  try {
    const db = new Database(DB_PATH, { readonly: false });
    
    console.log('📋 Checking database schema...');
    
    // 1. Créer la table notification_deliveries si elle n'existe pas
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='notification_deliveries'
    `).get();
    
    if (!tableExists) {
      console.log('📋 Creating notification_deliveries table...');
      
      db.exec(`
        CREATE TABLE IF NOT EXISTS "notification_deliveries" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          "event_id" INTEGER NOT NULL REFERENCES "notification_events"("id") ON DELETE CASCADE,
          "recipient" TEXT NOT NULL,
          "provider" TEXT DEFAULT 'evolution' NOT NULL,
          "status" TEXT DEFAULT 'pending' NOT NULL,
          "attempts" INTEGER DEFAULT 0 NOT NULL,
          "last_error" TEXT,
          "sent_at" INTEGER,
          "next_retry_at" INTEGER,
          "created_at" INTEGER NOT NULL
        );
      `);
      
      // Créer les indexes
      db.exec(`
        CREATE INDEX IF NOT EXISTS "notification_deliveries_event_id_idx" ON "notification_deliveries" ("event_id");
        CREATE INDEX IF NOT EXISTS "notification_deliveries_status_retry_idx" ON "notification_deliveries" ("status", "next_retry_at");
      `);
      
      console.log('✅ notification_deliveries table created');
    } else {
      console.log('✅ notification_deliveries table already exists');
    }
    
    // 2. Vérifier et ajouter les colonnes manquantes dans la table users
    const tableInfo = db.prepare(`PRAGMA table_info(users)`).all() as any[];
    
    const columnsToAdd = [
      { name: 'email_verified', sql: 'INTEGER' },
      { name: 'discord_user_id', sql: 'TEXT' },
      { name: 'discord_webhook', sql: 'TEXT' },
      { name: 'custom_webhook', sql: 'TEXT' },
      { name: 'whatsapp_number', sql: 'TEXT' }
    ];
    
    for (const column of columnsToAdd) {
      const exists = tableInfo.some(col => col.name === column.name);
      if (!exists) {
        console.log(`📋 Adding ${column.name} column to users table...`);
        try {
          db.exec(`ALTER TABLE users ADD COLUMN ${column.name} ${column.sql};`);
          console.log(`✅ ${column.name} column added`);
        } catch (error) {
          console.log(`⚠️  Could not add ${column.name} (might already exist): ${error}`);
        }
      } else {
        console.log(`✅ ${column.name} column already exists`);
      }
    }
    
    // 3. Vérifier si la table settings existe
    console.log('🔍 Checking if settings table exists...');
    const settingsTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='settings'
    `).get();
    console.log('📊 Settings table exists:', !!settingsTableExists);
    
    if (!settingsTableExists) {
      console.log('📋 Creating settings table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS "settings" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          "key" TEXT NOT NULL UNIQUE,
          "value" TEXT,
          "category" TEXT DEFAULT 'general' NOT NULL,
          "created_at" INTEGER NOT NULL,
          "updated_at" INTEGER NOT NULL
        );
      `);
      
      // Créer les indexes
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS "settings_key_unique" ON "settings" ("key");
      `);
      
      console.log('✅ settings table created');
    } else {
      console.log('✅ settings table already exists');
    }
    
    // 4. Vérifier si la table notification_events existe
    const eventsTableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='notification_events'
    `).get();
    
    if (!eventsTableExists) {
      console.log('📋 Creating notification_events table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS "notification_events" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          "request_id" INTEGER REFERENCES "media_requests"("id") ON DELETE SET NULL,
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
      
      // Créer les indexes
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS "notification_events_dedup_key_unique" ON "notification_events" ("dedup_key");
        CREATE INDEX IF NOT EXISTS "notification_events_request_event_idx" ON "notification_events" ("request_id", "event");
        CREATE INDEX IF NOT EXISTS "notification_events_status_created_idx" ON "notification_events" ("status", "created_at");
        CREATE INDEX IF NOT EXISTS "notification_events_tmdb_type_idx" ON "notification_events" ("tmdb_id", "media_type");
      `);
      
      console.log('✅ notification_events table created');
    } else {
      console.log('✅ notification_events table already exists');
    }
    
    db.close();
    console.log('🎉 Database schema fixed successfully!');
    console.log('');
    console.log('📝 Summary of changes:');
    console.log('  - Created settings table (if missing)');
    console.log('  - Created notification_deliveries table (if missing)');
    console.log('  - Created notification_events table (if missing)');
    console.log('  - Added missing columns to users table');
    console.log('');
    console.log('🔄 Please restart your application to apply the changes.');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
