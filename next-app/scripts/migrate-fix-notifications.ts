/**
 * Migration script to fix notification deliveries index
 * Run this in the Docker container to create the unique index and fix pending events
 */

import Database from 'better-sqlite3'

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/data/db/dev.db'
const db = new Database(dbPath)

try {
  console.log('=== Migration: Fix notification deliveries index ===')
  console.log(`Database path: ${dbPath}`)

  // Step 1: Check if index exists
  const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notification_deliveries' AND name = 'notification_deliveries_unique_recipient'`).all() as any[]
  
  if (indexes.length > 0) {
    console.log('Index notification_deliveries_unique_recipient already exists')
  } else {
    console.log('Index notification_deliveries_unique_recipient does not exist, creating it...')
    
    // Step 2: Find and remove duplicates
    const duplicates = db.prepare(`
      SELECT event_id, recipient, provider, COUNT(*) as count
      FROM notification_deliveries
      GROUP BY event_id, recipient, provider
      HAVING count > 1
    `).all() as any[]
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate groups, removing...`)
      let deleted = 0
      for (const dup of duplicates) {
        const result = db.prepare(`
          DELETE FROM notification_deliveries
          WHERE id NOT IN (
            SELECT MIN(id)
            FROM notification_deliveries
            WHERE event_id = ? AND recipient = ? AND provider = ?
          )
          AND event_id = ? AND recipient = ? AND provider = ?
        `).run(dup.event_id, dup.recipient, dup.provider, dup.event_id, dup.recipient, dup.provider)
        deleted += result.changes
      }
      console.log(`Deleted ${deleted} duplicate rows`)
    }
    
    // Step 3: Create the unique index
    db.prepare(`CREATE UNIQUE INDEX notification_deliveries_unique_recipient ON notification_deliveries (event_id, recipient, provider)`).run()
    console.log('Index created successfully')
  }

  // Step 4: Fix pending events without deliveries
  const pendingEvents = db.prepare(`
    SELECT id, event
    FROM notification_events
    WHERE status = 'pending'
    AND id NOT IN (SELECT DISTINCT event_id FROM notification_deliveries)
    ORDER BY id DESC
  `).all() as any[]
  
  if (pendingEvents.length > 0) {
    console.log(`\nFound ${pendingEvents.length} pending events without deliveries, fixing...`)
    
    // Get default recipient from users table
    const user = db.prepare(`SELECT whatsappNumber FROM users WHERE id = 1`).get() as any
    const defaultRecipient = user?.whatsappNumber || '33675199234'
    
    for (const e of pendingEvents) {
      try {
        const delivery = {
          event_id: e.id,
          recipient: defaultRecipient,
          provider: 'evolution',
          status: 'pending',
          attempts: 0,
          created_at: Date.now(),
          next_retry_at: Date.now()
        }
        
        const result = db.prepare(`
          INSERT INTO notification_deliveries (event_id, recipient, provider, status, attempts, created_at, next_retry_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          delivery.event_id,
          delivery.recipient,
          delivery.provider,
          delivery.status,
          delivery.attempts,
          delivery.created_at,
          delivery.next_retry_at
        )
        
        console.log(`  Event ${e.id} (${e.event}): Created delivery ID ${result.lastInsertRowid}`)
        
        // Mark event as dispatched
        db.prepare(`UPDATE notification_events SET status = 'dispatched' WHERE id = ?`).run(e.id)
        
      } catch (err: any) {
        console.error(`  Event ${e.id}: Error - ${err.message}`)
      }
    }
  } else {
    console.log('\nNo pending events without deliveries found')
  }

  console.log('\n=== Migration completed successfully ===')
} catch (err: any) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  db.close()
}
