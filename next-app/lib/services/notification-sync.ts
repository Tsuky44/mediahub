import { prisma } from '@/lib/prisma'
import { jellyseerrService } from './jellyseerr'

export async function syncMediaNotifications() {
  console.log('[Sync] Starting media notification sync...')
  
  try {
    // 1. Récupérer toutes les demandes en attente
    const pendingRequests = await prisma.mediaRequest.findMany({
      where: {
        status: 'pending'
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

          // 3. Créer une notification pour l'utilisateur
          await prisma.notification.create({
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

          // 4. Mettre à jour le statut de la demande locale
          await prisma.mediaRequest.update({
            where: { id: request.id },
            data: { status: 'available' }
          })
          
          console.log(`[Sync] Notification created and request updated for "${request.title}"`)
        }
      } catch (error) {
        console.error(`[Sync] Failed to check status for request ${request.id} (${request.title}):`, error)
      }
    }

    return { success: true, processed: pendingRequests.length }
  } catch (error) {
    console.error('[Sync] Critical error during notification sync:', error)
    return { success: false, error }
  }
}
