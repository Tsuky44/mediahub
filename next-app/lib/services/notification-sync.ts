import { prisma } from '@/lib/prisma'
import { JellyseerrService } from './jellyseerr'
import { syncJellyseerrRequests } from './request-sync'

export async function syncMediaNotifications() {
  console.log('[Sync] Starting multi-instance global sync...')
  
  try {
    // 1. Synchroniser toutes les demandes pour toutes les instances
    const syncResult = await syncJellyseerrRequests()
    const syncedCount = syncResult.count || 0

    const instances = await (prisma as any).instance.findMany()
    let totalProcessed = 0

    for (const instance of instances) {
      if (!instance.jellyseerrUrl || !instance.jellyseerrApiKey) continue

      console.log(`[Sync] Checking notifications for instance: ${instance.name} (${instance.id})`)
      
      try {
        const jellyseerrService = new JellyseerrService(instance.jellyseerrUrl, instance.jellyseerrApiKey)

        // 2. Récupérer les demandes en attente pour cette instance
        const pendingRequests = await (prisma as any).mediaRequest.findMany({
          where: {
            instanceId: instance.id,
            status: { in: [1, 2, 3] } 
          }
        })

        console.log(`[Sync] [Instance ${instance.id}] Found ${pendingRequests.length} pending requests to check.`)

        for (const request of pendingRequests) {
          try {
            const tmdbId = parseInt(request.tmdbId)
            const mediaType = request.mediaType as 'movie' | 'tv'
            
            // 2. Vérifier la disponibilité sur Jellyseerr
            const availability = await jellyseerrService.getMediaAvailability(tmdbId, mediaType)
            
            // Si le média est maintenant disponible
            if (availability.available && (availability.status === 'available' || availability.status === 'partial')) {
              console.log(`[Sync] [Instance ${instance.id}] Media "${request.title}" (${request.tmdbId}) is now ${availability.status}!`)
              
              let posterPath = null
              if (request.metadata) {
                try {
                  const meta = JSON.parse(request.metadata)
                  posterPath = meta.posterPath
                } catch (e) {}
              }

              // 3. Créer une notification pour l'utilisateur (seulement s'il est lié)
              if (request.userId) {
                await (prisma as any).notification.create({
                  data: {
                    userId: request.userId,
                    instanceId: instance.id,
                    title: 'Média disponible !',
                    message: `Votre demande pour "${request.title}" est maintenant disponible sur Emby.`,
                    type: 'media_available',
                    mediaId: request.tmdbId,
                    mediaType: request.mediaType,
                    posterPath: posterPath,
                    link: `/dashboard/media`,
                    isRead: false
                  }
                })
              }

              // 4. Mettre à jour le statut de la demande locale
              await (prisma as any).mediaRequest.update({
                where: { id: request.id },
                data: { status: 5 } // 5 = Available in Jellyseerr
              })
              
              console.log(`[Sync] [Instance ${instance.id}] Notification created and request updated for "${request.title}"`)
            }
          } catch (error) {
            console.error(`[Sync] [Instance ${instance.id}] Failed to check status for request ${request.id} (${request.title}):`, error)
          }
        }
        totalProcessed += pendingRequests.length
      } catch (err) {
        console.error(`[Sync] [Instance ${instance.id}] Error during notification sync:`, err)
      }
    }

    return { success: true, processed: totalProcessed, syncedCount }
  } catch (error) {
    console.error('[Sync] Critical error during multi-instance notification sync:', error)
    return { success: false, error }
  }
}
