import Database from 'better-sqlite3'

const dbs = [
  'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\data\\dev.db',
  'C:\\Users\\Mathis\\Documents\Project\\mediahub\\data\\db\\dev.db',
  'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db',
  'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\prisma\\dev.db'
]

function main() {
  for (const dbPath of dbs) {
    console.log(`Checking DB: ${dbPath}`)
    try {
      const db = new Database(dbPath, { readonly: true })
      const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='notification_events'`).get()
      if (!tableCheck) {
        console.log('No notification_events table.')
        continue
      }
      
      const rows = db.prepare(`SELECT id, event, created_at, payload FROM notification_events WHERE payload LIKE '%348745%'`).all() as any[]
      console.log(`Found ${rows.length} matches:`)
      for (const r of rows) {
        console.log(`  ID: ${r.id} | Event: ${r.event} | CreatedAt: ${r.created_at} | Payload: ${r.payload}`)
      }
    } catch (err: any) {
      console.log(`Error: ${err.message}`)
    }
  }
}

main()
