import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  const event = db.prepare(`SELECT id, event, status, payload FROM notification_events WHERE id = 14617`).get() as any
  console.log('Event ID 14617:')
  console.log('Event:', event.event)
  console.log('Status:', event.status)
  console.log('Payload:', event.payload)
  
  const deliveries = db.prepare(`SELECT * FROM notification_deliveries WHERE event_id = 14617`).all() as any[]
  console.log('\nDeliveries:', deliveries.length)
  for (const d of deliveries) {
    console.log(JSON.stringify(d, null, 2))
  }
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
