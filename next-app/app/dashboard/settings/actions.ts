'use server'

import { prisma } from '@/lib/prisma'
import { importPlexHistory } from '@/lib/plex-import'
import { importJellyseerrRequests } from '@/lib/jellyseerr-import'
import { JellyseerrService } from '@/lib/services/jellyseerr'
import { revalidatePath } from 'next/cache'
import { getCurrentUser, getTmdbServiceForUser } from '@/lib/auth'
import { UnraidService } from '@/lib/services/unraid'
import { QBittorrentService } from '@/lib/services/qbittorrent'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function testQBittorrentConnectionAction(url: string, username?: string, password?: string) {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const service = new QBittorrentService(url, username, password)
        const result = await service.testConnection()
        
        if (result.success) {
            return { success: true, message: `Connexion réussie ! Version : ${result.version}` }
        } else {
            return { success: false, message: `Échec de la connexion : ${result.error}` }
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function testUnraidDebugAction() {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const settings = await (prisma as any).setting.findMany({
            where: {
                key: { in: ['unraid_url', 'unraid_api_key'] }
            }
        });

        const url = settings.find((s: any) => s.key === 'unraid_url')?.value;
        const apiKey = settings.find((s: any) => s.key === 'unraid_api_key')?.value;

        if (!url || !apiKey) {
            return { success: false, message: 'Configuration Unraid manquante dans la DB.' };
        }

        log(`[Debug Unraid] Test manuel sur ${url}`);
        const service = new UnraidService(url, apiKey);
        const stats = await service.getStorageStats();

        if (stats) {
            return { 
                success: true, 
                message: `Connexion réussie ! Stockage : ${stats.used} / ${stats.total} (${stats.percent}%)` 
            };
        }

        return { success: false, message: 'Échec de la récupération des stats. Vérifiez les logs serveur.' };
    } catch (error: any) {
        error('[testUnraidDebugAction] Error:', error);
        return { success: false, message: error.message };
    }
}

export async function importPlexHistoryAction() {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        log(`[Action] Starting Plex history import`)
        
        const result = await importPlexHistory(prisma as any)
        
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard')
        
        return { 
            success: true, 
            message: `Import réussi : ${result.imported} nouveaux éléments, ${result.skipped} ignorés.` 
        }
    } catch (error: any) {
        error('[importPlexHistoryAction] Error:', error)
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

export async function testProwlarrConnectionAction(url: string, key: string) {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const { ProwlarrService } = await import('@/lib/services/prowlarr')
        const service = new ProwlarrService(url, key)
        const indexers = await service.getIndexers()
        
        const success = Array.isArray(indexers)
        
        return { 
            success, 
            message: success ? `Connexion réussie ! ${indexers.length} indexeurs trouvés.` : 'Échec de la connexion. Vérifiez l\'URL et la clé API.' 
        }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function fixMissingTitlesAction() {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const tmdb = await getTmdbServiceForUser()
        if (!tmdb) {
            throw new Error('Clé API TMDB manquante (vérifiez la configuration).')
        }
        
        const requests = await (prisma as any).mediaRequest.findMany({})

        let fixed = 0
        log(`[fixMissingTitlesAction] Checking ${requests.length} requests`)

        for (const req of requests) {
            if (!req.tmdbId) continue
            
            // Check if title is missing or generic
            const isMissing = !req.title || 
                             req.title === 'Unknown Movie' || 
                             req.title === 'Unknown Show' || 
                             req.title === '' ||
                             req.title.toLowerCase().includes('unknown')

            if (!isMissing) continue

            log(`[fixMissingTitlesAction] Fixing title for ${req.mediaType} ${req.tmdbId}`)
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

export async function importJellyseerrRequestsAction() {
    try {
        const user = await getCurrentUser()
        if (!user || (user as any).role !== 'admin') {
            throw new Error('Unauthorized')
        }

        // Delete all existing requests first as requested
        log(`[Action] Deleting all requests`)
        await (prisma as any).mediaRequest.deleteMany({})

        const result = await importJellyseerrRequests(prisma as any)
        
        // After import, run the fix titles action automatically
        log(`[Action] Fixing missing titles`)
        await fixMissingTitlesAction()
        
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
