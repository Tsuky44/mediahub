import { dispatch } from '../lib/notifications-v2/dispatcher'
import { NOTIFICATION_EVENTS } from '../lib/notifications-v2/types'

async function main() {
  console.log('Testing dispatch of MEDIA_DOWNLOADING without requester...')
  
  const result = await dispatch(NOTIFICATION_EVENTS.MEDIA_DOWNLOADING, {
    media: {
      tmdbId: '127529',
      mediaType: 'tv',
      title: 'Bloodhounds (2023)',
      seasonNumber: 1
    },
    requester: undefined // NO REQUESTER
  })
  
  console.log('Dispatch result:', JSON.stringify(result, null, 2))
}

main().catch(console.error)
