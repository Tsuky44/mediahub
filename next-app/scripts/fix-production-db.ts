#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'db', 'dev.db');

function main() {
  console.log('🔧 Fixing production database schema...');
  
  try {
    const db = new Database(DB_PATH);
    
    // Vérifier si la table notification_deliveries existe
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='notification_deliveries'
    `).get();
    
    if (!tableExists) {
      console.log('📋 Creating notification_deliveries table...');
      
      // Lire et exécuter la migration
      const migrationSQL = readFileSync(
        join(process.cwd(), 'lib', 'db', 'migrations', '0001_notif_v2_outbox.sql'),
        'utf-8'
      );
      
      const statements = migrationSQL.split(';').filter(s => s.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            db.exec(statement);
          } catch (error) {
            console.log('⚠️  Statement failed (might already exist):', statement.substring(0, 50) + '...');
          }
        }
      }
      
      console.log('✅ notification_deliveries table created');
    } else {
      console.log('✅ notification_deliveries table already exists');
    }
    
    // Vérifier si la colonne email_verified existe dans la table users
    const columnExists = db.prepare(`
      PRAGMA table_info(users)
    `).all() as any[];
    
    const hasEmailVerified = columnExists.some(col => col.name === 'email_verified');
    
    if (!hasEmailVerified) {
      console.log('📋 Adding email_verified column to users table...');
      db.exec(`
        ALTER TABLE users ADD COLUMN email_verified INTEGER;
      `);
      console.log('✅ email_verified column added');
    } else {
      console.log('✅ email_verified column already exists');
    }
    
    // Vérifier d'autres colonnes potentiellement manquantes
    const requiredColumns = [
      'discord_user_id',
      'discord_webhook',
      'custom_webhook',
      'whatsapp_number'
    ];
    
    for (const column of requiredColumns) {
      const hasColumn = columnExists.some(col => col.name === column);
      if (!hasColumn) {
        console.log(`📋 Adding ${column} column to users table...`);
        db.exec(`
          ALTER TABLE users ADD COLUMN ${column} TEXT;
        `);
        console.log(`✅ ${column} column added`);
      }
    }
    
    db.close();
    console.log('🎉 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
