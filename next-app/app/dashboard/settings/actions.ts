'use server'

import { prisma } from '@/lib/prisma'
import { importPlexHistory } from '@/lib/plex-import'
import { importJellyseerrRequests } from '@/lib/jellyseerr-import'
import { JellyseerrService } from '@/lib/services/jellyseerr'
import { revalidatePath } from 'next/cache'
import { getCurrentUser, getTmdbServiceForUser } from '@/lib/auth'

export async function importPlexHistoryAction(instanceId: number) {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        console.log(`[Action] Starting Plex history import for instance ${instanceId}`)
        
        const result = await importPlexHistory(prisma as any, instanceId)
        
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard')
        
        return { 
            success: true, 
            message: `Import réussi : ${result.imported} nouveaux éléments, ${result.skipped} ignorés.` 
        }
    } catch (error: any) {
        console.error('[importPlexHistoryAction] Error:', error)
        return { 
            success: false, 
            message: error.message || 'Erreur lors de l\'importation' 
        }
    }
}

export async function testJellyseerrConnectionAction(url: string, key: string) {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const service = new JellyseerrService(url, key)
        const success = await service.testConnection()
        
        return { 
            success, 
            message: success ? 'Connexion réussie !' : 'Échec de la connexion. Vérifiez l\'URL et la clé API.' 
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function fixMissingTitlesAction(instanceId: number) {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const tmdb = await getTmdbServiceForUser(instanceId)
        if (!tmdb) {
            throw new Error('Clé API TMDB manquante (vérifiez la configuration de l\'instance par défaut).')
        }
        
        const requests = await (prisma as any).mediaRequest.findMany({
            where: {
                instanceId
            }
        })

        let fixed = 0
        console.log(`[fixMissingTitlesAction] Checking ${requests.length} requests for instance ${instanceId}`)

        for (const req of requests) {
            if (!req.tmdbId) continue
            
            // Check if title is missing or generic
            const isMissing = !req.title || 
                             req.title === 'Unknown Movie' || 
                             req.title === 'Unknown Show' || 
                             req.title === '' ||
                             req.title.toLowerCase().includes('unknown')

            if (!isMissing) continue

            console.log(`[fixMissingTitlesAction] Fixing title for ${req.mediaType} ${req.tmdbId}`)
            const details = await tmdb.getDetails(parseInt(req.tmdbId), req.mediaType as 'movie' | 'tv')
            
            if (details) {
                const title = req.mediaType === 'movie' ? details.title : details.name
                if (title) {
                    await (prisma as any).mediaRequest.update({
                        where: { id: req.id },
                        data: { title }
                    })
                    fixed++
                }
            }
        }

        revalidatePath('/dashboard/requests')
        
        return { 
            success: true, 
            message: `${fixed} titres de demandes ont été corrigés.` 
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function importJellyseerrRequestsAction(instanceId: number) {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        // Delete all existing requests first as requested
        console.log(`[Action] Deleting all requests for instance ${instanceId}`)
        await (prisma as any).mediaRequest.deleteMany({
            where: { instanceId }
        })

        const result = await importJellyseerrRequests(prisma as any, instanceId)
        
        // After import, run the fix titles action automatically
        console.log(`[Action] Fixing missing titles for instance ${instanceId}`)
        await fixMissingTitlesAction(instanceId)
        
        revalidatePath('/dashboard/requests')
        revalidatePath('/dashboard/settings')
        
        return { 
            success: true, 
            message: `Import réussi : ${result.imported} demandes importées.` 
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}
