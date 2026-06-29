import { ConfigStore } from '../lib/notifications-v2/config/config-store'
import { resolveRecipients } from '../lib/notifications-v2/store/recipient-resolver'
import { db } from '../lib/db/drizzle'
import { users } from '../lib/db/schema'
import { inArray } from 'drizzle-orm'

async function main() {
  const config = await ConfigStore.load(true)
  console.log('Is Config Enabled?', config.enabled)
  
  const event = 'MEDIA_DOWNLOADING'
  const route = config.events[event]
  console.log(`Route config for ${event}:`, JSON.stringify(route, null, 2))
  
  const ids = (route.targetUserIds ?? [])
    .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
    .filter((id): id is number => typeof id === 'number' && !isNaN(id))
  console.log('Parsed user IDs:', ids)
  
  if (ids.length > 0) {
    const usersList = await db.query.users.findMany({
      where: inArray(users.id, ids),
      columns: { id: true, whatsappNumber: true, name: true, email: true },
    })
    console.log('Query results for target users:')
    for (const u of usersList) {
      console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Whatsapp: "${u.whatsappNumber}" (typeof: ${typeof u.whatsappNumber})`)
      if (u.whatsappNumber) {
        console.log(`  trim length: ${u.whatsappNumber.trim().length}`)
      }
    }
  }
  
  const result = await resolveRecipients(config, event, undefined, config.evolution.defaultNumber)
  console.log('resolveRecipients Result:')
  console.log(`- Recipients:`, Array.from(result.recipients))
  console.log(`- Log Info:`, result.logInfo)
}

main().catch(console.error)
