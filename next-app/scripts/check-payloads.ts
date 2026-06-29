import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  const events = db.prepare(`SELECT id, event, status, created_at, payload FROM notification_events ORDER BY id DESC LIMIT 5`).all() as any[]
  console.log('Latest 5 events with payload:')
  for (const e of events) {
    console.log(`\nID: ${e.id} | Event: ${e.event} | Status: ${e.status}`)
    try {
      const payload = JSON.parse(e.payload)
      console.log('Payload:', JSON.stringify(payload, null, 2))
    } catch {
      console.log('Payload (raw):', e.payload)
    }
  }
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
