import { db } from '../lib/db/drizzle'
import { notificationEvents, notificationDeliveries, users } from '../lib/db/schema'
import { desc } from 'drizzle-orm'

async function main() {
  console.log('--- LATEST NOTIFICATION EVENTS ---')
  const events = await db.query.notificationEvents.findMany({
    orderBy: [desc(notificationEvents.createdAt)],
    limit: 5
  })
  
  for (const e of events) {
    console.log(`\nEvent ID: ${e.id}, Event: ${e.event}, Status: ${e.status}, CreatedAt: ${e.createdAt}`)
    console.log(`Payload:`, e.payload)
    
    const deliveries = await db.query.notificationDeliveries.findMany({
      where: (del, { eq }) => eq(del.eventId, e.id)
    })
    console.log(`Deliveries (${deliveries.length}):`)
    for (const d of deliveries) {
      console.log(`  - Delivery ID: ${d.id}, Recipient: ${d.recipient}, Status: ${d.status}, Last Error: ${d.lastError}`)
    }
  }
}

main().catch(console.error)
