import { dispatch } from '../lib/notifications-v2/dispatcher'
import { NOTIFICATION_EVENTS } from '../lib/notifications-v2/types'

async function main() {
  console.log('=== Test 1: Dispatch MEDIA_DOWNLOADING WITHOUT requester ===')
  const result1 = await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOADING, {
    media: {
      tmdbId: '888888',
      mediaType: 'tv',
      title: 'Test Without Requester',
      seasonNumber: 1
    },
    requester: undefined
  })
  console.log('Result 1:', JSON.stringify(result1, null, 2))
  
  console.log('\n=== Test 2: Dispatch MEDIA_DOWNLOADING WITH requester ===')
  const result2 = await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOADING, {
    media: {
      tmdbId: '777777',
      mediaType: 'tv',
      title: 'Test With Requester',
      seasonNumber: 1
    },
    requester: { id: 1, name: 'mathis', whatsappNumber: '33675199234' }
  })
  console.log('Result 2:', JSON.stringify(result2, null, 2))
}

main().catch(console.error)
