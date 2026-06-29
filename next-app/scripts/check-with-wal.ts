import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath) // Not readonly, so it can resolve WAL checkpoint if needed

try {
  const count = db.prepare('SELECT COUNT(*) as count FROM notification_events').get() as { count: number }
  console.log(`Total events: ${count.count}`)
  
  const latest = db.prepare('SELECT id, event, status, created_at, payload FROM notification_events ORDER BY id DESC LIMIT 10').all() as any[]
  for (const e of latest) {
    const date = new Date(e.created_at)
    console.log(`ID: ${e.id} | Event: ${e.event} | Status: ${e.status} | CreatedAt: ${e.created_at} (${date.toISOString()})`)
    console.log(`Payload: ${e.payload.substring(0, 100)}...`)
  }
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
