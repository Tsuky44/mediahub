import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  const events = db.prepare('SELECT id, event, status, created_at, payload FROM notification_events WHERE event = ? ORDER BY id DESC').all('MEDIA_DOWNLOADING') as any[]
  console.log(`Found ${events.length} MEDIA_DOWNLOADING events:`)
  for (const e of events) {
    const date = new Date(e.created_at)
    console.log(`ID: ${e.id} | Status: ${e.status} | CreatedAt: ${e.created_at} (${date.toISOString()})`)
    console.log(`Payload: ${e.payload}`)
  }
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
