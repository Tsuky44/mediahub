import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  // Get recent pending events that have no deliveries
  const events = db.prepare(`
    SELECT id, event, payload
    FROM notification_events
    WHERE status = 'pending'
    AND id NOT IN (SELECT DISTINCT event_id FROM notification_deliveries)
    ORDER BY id DESC
    LIMIT 10
  `).all() as any[]
  
  console.log(`Found ${events.length} pending events without deliveries:`)
  
  for (const e of events) {
    console.log(`\nEvent ID: ${e.id} | Event: ${e.event}`)
    
    try {
      const payload = JSON.parse(e.payload)
      const requester = payload.requester
      
      // Manually create a delivery for the default recipient (user 1)
      const delivery = {
        event_id: e.id,
        recipient: '33675199234',
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
      
      console.log(`  -> Created delivery ID: ${result.lastInsertRowid}`)
      
      // Mark event as dispatched
      db.prepare(`UPDATE notification_events SET status = 'dispatched' WHERE id = ?`).run(e.id)
      console.log(`  -> Marked event as dispatched`)
      
    } catch (err: any) {
      console.error(`  -> Error: ${err.message}`)
    }
  }
  
  console.log('\nDone')
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
