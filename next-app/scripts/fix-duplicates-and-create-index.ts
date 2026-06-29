import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  console.log('Finding duplicate deliveries...')
  const duplicates = db.prepare(`
    SELECT event_id, recipient, provider, COUNT(*) as count
    FROM notification_deliveries
    GROUP BY event_id, recipient, provider
    HAVING count > 1
  `).all() as any[]
  
  console.log(`Found ${duplicates.length} duplicate groups:`)
  for (const dup of duplicates) {
    console.log(`  - Event ${dup.event_id}, Recipient ${dup.recipient}, Provider ${dup.provider}: ${dup.count} rows`)
  }
  
  if (duplicates.length > 0) {
    console.log('\nDeleting duplicates (keeping the oldest row per group)...')
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
  
  console.log('\nNow creating unique index...')
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_unique_recipient ON notification_deliveries (event_id, recipient, provider)`).run()
  console.log('Index created successfully')
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
