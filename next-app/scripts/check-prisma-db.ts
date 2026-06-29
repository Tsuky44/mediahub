import Database from 'better-sqlite3'

const dbPath = 'C:\\Users\\Mathis\\Documents\\Project\\mediahub\\next-app\\prisma\\dev.db'
const db = new Database(dbPath, { readonly: true })

try {
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as any[]
  console.log('Tables in prisma/dev.db:')
  for (const t of tables) {
    const count = db.prepare(`SELECT COUNT(*) as count FROM "${t.name}"`).get() as { count: number }
    console.log(`- ${t.name}: ${count.count} rows`)
  }
} catch (err: any) {
  console.error(err)
}
