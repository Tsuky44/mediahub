#!/usr/bin/env node
/**
 * Enable WAL mode for SQLite to improve concurrency
 * This allows reads to proceed while writes are in progress
 */

const { execSync } = require('child_process');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || 'file:./db.sqlite';

console.log('[WAL] Enabling WAL mode for SQLite...');
console.log(`[WAL] Database: ${dbUrl}`);

try {
  // Extract database file path from DATABASE_URL
  let dbPath;
  if (dbUrl.startsWith('file:')) {
    dbPath = dbUrl.replace('file:', '').replace('file://', '');
    // Handle relative paths
    if (dbPath.startsWith('./')) {
      dbPath = path.join(process.cwd(), dbPath.slice(2));
    } else if (dbPath.startsWith('.\\')) {
      dbPath = path.join(process.cwd(), dbPath.slice(2));
    } else if (!path.isAbsolute(dbPath)) {
      dbPath = path.join(process.cwd(), dbPath);
    }
  } else {
    dbPath = dbUrl;
  }

  console.log(`[WAL] Resolved path: ${dbPath}`);

  // Check if database file exists
  const fs = require('fs');
  if (!fs.existsSync(dbPath)) {
    console.log('[WAL] Database file does not exist yet, skipping WAL mode setup.');
    process.exit(0);
  }

  // Enable WAL mode and set busy timeout using sqlite3 CLI
  // Busy timeout of 10 seconds (10000ms) allows waiting for locks instead of immediate failure
  const commands = [
    'PRAGMA journal_mode=WAL;',
    'PRAGMA busy_timeout=10000;',
    'PRAGMA wal_autocheckpoint=1000;',
    'PRAGMA journal_mode;'
  ].join(' ');

  const output = execSync(`sqlite3 "${dbPath}" "${commands}"`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log(`[WAL] Output: ${output.trim()}`);

  if (output.includes('wal')) {
    console.log('[WAL] Successfully enabled WAL mode for SQLite');
  } else {
    console.warn('[WAL] Warning: Could not verify WAL mode, but continuing...');
  }

  process.exit(0);
} catch (error) {
  console.error('[WAL] Error enabling WAL mode:', error.message);
  // Don't fail the startup if WAL mode fails - the app can still work
  console.log('[WAL] Continuing without WAL mode...');
  process.exit(0);
}
