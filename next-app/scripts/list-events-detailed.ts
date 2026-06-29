import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath, { readonly: true })

try {
  const count = db.prepare('SELECT COUNT(*) as count FROM notification_events').get() as { count: number }
  console.log(`Total events: ${count.count}`)
  
  const events = db.prepare('SELECT id, event, status, created_at FROM notification_events ORDER BY id DESC LIMIT 20').all() as any[]
  for (const e of events) {
    const date = new Date(e.created_at)
    console.log(`ID: ${e.id} | Event: ${e.event} | Status: ${e.status} | CreatedAt: ${e.created_at} (${date.toISOString()})`)
  }
} catch (err: any) {
  console.error(err)
}
