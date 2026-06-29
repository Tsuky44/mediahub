import { db } from '../lib/db/drizzle'
import { users, settings } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('--- USERS ---')
  const allUsers = await db.query.users.findMany()
  for (const u of allUsers) {
    console.log(`User ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Whatsapp: "${u.whatsappNumber}"`)
  }

  console.log('\n--- SETTINGS FOR NOTIFICATIONS_V2_CONFIG ---')
  const configRow = await db.query.settings.findFirst({
    where: eq(settings.key, 'notifications_v2_config')
  })
  if (configRow) {
    console.log('Config Value:', JSON.stringify(JSON.parse(configRow.value ?? '{}'), null, 2))
  } else {
    console.log('No notifications_v2_config row found!')
  }
}

main().catch(console.error)
