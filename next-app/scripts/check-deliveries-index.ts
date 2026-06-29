import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notification_deliveries'`).all() as any[]
  console.log('Indexes on notification_deliveries:')
  for (const idx of indexes) {
    console.log(`  - ${idx.name}`)
  }
  
  const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notification_deliveries'`).get() as any
  console.log('\nTable schema:')
  console.log(schema.sql)
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
