import { prisma } from '@/lib/prisma'
import { jellyseerrService } from './jellyseerr'
import { syncJellyseerrRequests } from './request-sync'

export async function syncMediaNotifications() {
  console.log('[Sync] Starting global sync...')
  
  try {
    // 1. Synchroniser les demandes depuis Jellyseerr vers la DB locale
    const syncResult = await syncJellyseerrRequests()
    const syncedCount = syncResult.count || 0

    // 2. Récupérer toutes les demandes en attente dans notre DB locale (code numérique Jellyseerr)
    // Statuts Jellyseerr : 1=PENDING, 2=APPROVED, 3=PROCESSING, 4=PARTIAL, 5=AVAILABLE
    const pendingRequests = await (prisma as any).mediaRequest.findMany({
      where: {
        status: { in: [1, 2, 3] } 
      }
    })

    console.log(`[Sync] Found ${pendingRequests.length} pending requests to check.`)

    for (const request of pendingRequests) {
      try {
        const tmdbId = parseInt(request.tmdbId)
        const mediaType = request.mediaType as 'movie' | 'tv'
        
        // 2. Vérifier la disponibilité sur Jellyseerr
        const availability = await jellyseerrService.getMediaAvailability(tmdbId, mediaType)
        
        // Si le média est maintenant disponible
        if (availability.available && (availability.status === 'available' || availability.status === 'partial')) {
          console.log(`[Sync] Media "${request.title}" (${request.tmdbId}) is now ${availability.status}!`)
          
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
          
          console.log(`[Sync] Notification created and request updated for "${request.title}"`)
        }
      } catch (error) {
        console.error(`[Sync] Failed to check status for request ${request.id} (${request.title}):`, error)
      }
    }

    return { success: true, processed: pendingRequests.length, syncedCount }
  } catch (error) {
    console.error('[Sync] Critical error during notification sync:', error)
    return { success: false, error }
  }
}
