import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db'
const db = new Database(dbPath)

try {
  console.log('Creating unique index notification_deliveries_unique_recipient...')
  db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS notification_deliveries_unique_recipient ON notification_deliveries (event_id, recipient, provider)`).run()
  console.log('Index created successfully')
  
  const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notification_deliveries'`).all() as any[]
  console.log('\nIndexes on notification_deliveries:')
  for (const idx of indexes) {
    console.log(`  - ${idx.name}`)
  }
} catch (err: any) {
  console.error('Error:', err.message)
} finally {
  db.close()
}
