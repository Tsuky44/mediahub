import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  const events = db.prepare(`SELECT id, event, status FROM notification_events WHERE status = 'pending' ORDER BY id DESC LIMIT 10`).all() as any[]
  console.log('Pending events and their deliveries:')
  for (const e of events) {
    const deliveries = db.prepare(`SELECT id, recipient, status FROM notification_deliveries WHERE event_id = ?`).all(e.id) as any[]
    console.log(`\nEvent ID: ${e.id} | Event: ${e.event} | Status: ${e.status}`)
    console.log(`Deliveries: ${deliveries.length}`)
    for (const d of deliveries) {
      console.log(`  - Delivery ID: ${d.id} | Recipient: ${d.recipient} | Status: ${d.status}`)
    }
  }
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
