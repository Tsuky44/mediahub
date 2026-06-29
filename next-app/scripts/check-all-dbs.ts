import Database from 'better-sqlite3'
import { resolve } from 'path'

const dbs = [
  'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\data\\dev.db',
  'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\data\\db\\dev.db',
  'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\data\\db\\dev.db',
  'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\prisma\\dev.db'
]

function main() {
  for (const dbPath of dbs) {
    console.log(`\n========================================`)
    console.log(`Checking DB: ${dbPath}`)
    try {
      const db = new Database(dbPath, { readonly: true })
      
      // Check if table exists
      const tableCheck = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='notification_events'`).get()
      if (!tableCheck) {
        console.log('No notification_events table here.')
        continue
      }
      
      const count = db.prepare('SELECT COUNT(*) as count FROM notification_events').get() as { count: number }
      console.log(`Total events: ${count.count}`)
      
      const latest = db.prepare('SELECT id, event, created_at, payload FROM notification_events ORDER BY id DESC LIMIT 5').all() as any[]
      console.log('Latest 5 events:')
      for (const e of latest) {
        const payloadTruncated = e.payload.substring(0, 150)
        console.log(`  ID: ${e.id} | Event: ${e.event} | CreatedAt: ${e.created_at} | Payload: ${payloadTruncated}...`)
      }
    } catch (err: any) {
      console.log(`Error reading DB: ${err.message}`)
    }
  }
}

main()
