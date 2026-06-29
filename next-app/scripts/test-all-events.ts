import { ConfigStore } from '../lib/notifications-v2/config/config-store'
import { resolveRecipients } from '../lib/notifications-v2/store/recipient-resolver'
import { NOTIFICATION_EVENTS } from '../lib/notifications-v2/types'

async function main() {
  const config = await ConfigStore.load(true)
  
  const events: Array<keyof typeof NOTIFICATION_EVENTS> = ['MEDIA_DOWNLOADING', 'MEDIA_DOWNLOAD_COMPLETE', 'MEDIA_AVAILABLE']
  
  for (const event of events) {
    console.log(`\n=== Event: ${event} ===`)
    const route = config.events[event]
    console.log('Enabled:', route?.enabled)
    console.log('targetUserIds:', route?.targetUserIds)
    console.log('targetNumbers:', route?.targetNumbers)
    console.log('notifyRequester:', route?.notifyRequester)
    
    // Test without requester
    const result1 = await resolveRecipients(config, event, undefined, config.evolution.defaultNumber)
    console.log('Without requester -> Recipients:', Array.from(result1.recipients))
    console.log('Log:', result1.logInfo)
    
    // Test with requester
    const result2 = await resolveRecipients(config, event, { id: 1, whatsappNumber: '33675199234' }, config.evolution.defaultNumber)
    console.log('With requester -> Recipients:', Array.from(result2.recipients))
    console.log('Log:', result2.logInfo)
  }
}

main().catch(console.error)
