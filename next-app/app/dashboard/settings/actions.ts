'use server'

import { db } from '@/lib/db/drizzle'
import { accountRequests, users, settings as settingsTable, mediaRequests } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { importPlexHistory } from '@/lib/plex-import'
import { importJellyseerrRequests } from '@/lib/jellyseerr-import'
import { JellyseerrService } from '@/lib/services/jellyseerr'
import { revalidatePath } from 'next/cache'
import { getCurrentUser, getTmdbServiceForUser } from '@/lib/auth'
import { UnraidService } from '@/lib/services/unraid'
import { QBittorrentService } from '@/lib/services/qbittorrent'

import { logger } from '@/lib/logger'


export async function testQBittorrentConnectionAction(url: string, username?: string, password?: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const service = new QBittorrentService(url, username, password)
        const result = await service.testConnection()
        
        if (result.success) {
            return { success: true, message: `Connexion réussie ! Version : ${result.version}` }
        } else {
            return { success: false, message: `Échec de la connexion : ${result.error}` }
        }
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}

import { EmbyService } from '@/lib/services/emby'

export async function approveAccountRequestAction(requestId: string, templateUserId?: string, customName?: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const [request] = await db.select().from(accountRequests).where(eq(accountRequests.id, requestId)).limit(1)

        if (!request) {
            throw new Error('Demande introuvable')
        }

        if (request.status !== 'PENDING') {
            throw new Error('Cette demande a déjà été traitée')
        }

        // Check if user already exists locally
        const [existingUser] = await db.select().from(users).where(eq(users.email, request.email)).limit(1)

        if (existingUser) {
            // If user exists, just mark request as approved
            await db.update(accountRequests).set({ status: 'APPROVED' }).where(eq(accountRequests.id, requestId))
            
            revalidatePath('/dashboard/settings')
            return { success: true, message: 'Demande approuvée (utilisateur existant).' }
        }

        // Emby Integration: Create User and Apply Template if requested
        let embyMessage = '';
        
        try {
            // Fetch Emby settings
            const settingsList = await db.select().from(settingsTable).where(inArray(settingsTable.key, ['emby_url', 'emby_api_key']));
            
            const embyUrl = settingsList.find((s: any) => s.key === 'emby_url')?.value;
            const embyApiKey = settingsList.find((s: any) => s.key === 'emby_api_key')?.value;

            if (embyUrl && embyApiKey) {
                const embyService = new EmbyService(embyUrl, embyApiKey)
                
                // 1. Create User in Emby
                const newUserName = customName || request.firstName
                
                let newEmbyUser;
                try {
                    newEmbyUser = await embyService.createUser(newUserName)
                } catch (e) {
                        // If creation fails, try to find existing user
                        logger.error("Emby create user failed:", e)
                        const users = await embyService.getUsers()
                        newEmbyUser = users.find((u: { Name?: string }) => u.Name === newUserName)
                        if (!newEmbyUser) {
                             embyMessage = ` (Échec création Emby: ${(e as Error).message})`
                             // Don't throw, proceed with just approval
                        }
                }

                if (newEmbyUser && newEmbyUser.Id) {
                    // 2. Get Template User Policy (if template provided)
                    if (templateUserId) {
                        const templateUser = await embyService.getUser(templateUserId)
                        
                        if (templateUser) {
                            // 3. Apply Policy to New User
                            if (templateUser.Policy) {
                                await embyService.updateUserPolicy(newEmbyUser.Id, templateUser.Policy)
                            }
                            // 4. Apply Configuration
                            if (templateUser.Configuration) {
                                await embyService.updateUserConfiguration(newEmbyUser.Id, templateUser.Configuration)
                            }
                        }
                    }

                    // 5. Link Emby Connect (Using specific endpoint)
                    // Check if already linked from creation
                    const userToUpdate = await embyService.getUser(newEmbyUser.Id)
                    if (userToUpdate.ConnectUserName === request.email) {
                         embyMessage = ' Utilisateur Emby créé et lié (via création).'
                    } else {
                        try {
                            await embyService.linkUserToConnect(newEmbyUser.Id, request.email)
                            embyMessage = ' Utilisateur Emby créé et lié (invitation envoyée).'
                        } catch (e) {
                            embyMessage = ` (Attention: Erreur liaison Emby Connect - ${(e as Error).message})`
                        }
                    }
                }
            }
        } catch (error) {
            logger.error("Emby automation failed:", error)
            embyMessage = ` (Attention: Erreur Emby - ${(error as Error).message})`
        }


        // Mark request as approved - User will be created via Emby/Plex/Jellyfin sync (login)
        await db.update(accountRequests).set({ status: 'APPROVED' }).where(eq(accountRequests.id, requestId))

        try {
            const { logAction } = await import('@/lib/audit')
            await logAction(
                parseInt(user?.id),
                'ACCOUNT_REQUEST_APPROVE',
                'AccountRequest',
                requestId,
                { email: request.email, firstName: request.firstName }
            )

            const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
            await ExternalNotificationService.send('account_request', {
                title: 'Demande de compte approuvée',
                message: `La demande de ${request.firstName} (${request.email}) a été approuvée.`,
                data: { email: request.email, firstName: request.firstName, status: 'approved' }
            })
        } catch (e) {
            logger.error('Failed to log account request approval:', e)
        }

        revalidatePath('/dashboard/settings')
        return { success: true, message: `Demande approuvée.${embyMessage}` }
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}

export async function rejectAccountRequestAction(requestId: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const [request] = await db.update(accountRequests).set({ status: 'REJECTED' }).where(eq(accountRequests.id, requestId)).returning()

        try {
            const { logAction } = await import('@/lib/audit')
            await logAction(
                parseInt(user?.id),
                'ACCOUNT_REQUEST_REJECT',
                'AccountRequest',
                requestId,
                { email: request.email, firstName: request.firstName }
            )
        } catch (e) {
            logger.error('Failed to log account request rejection:', e)
        }

        revalidatePath('/dashboard/settings')
        return { success: true, message: 'Demande rejetée.' }
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}

export async function deleteAccountRequestAction(requestId: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const [request] = await db.delete(accountRequests).where(eq(accountRequests.id, requestId)).returning()

        try {
            const { logAction } = await import('@/lib/audit')
            await logAction(
                parseInt(user?.id),
                'ACCOUNT_REQUEST_DELETE',
                'AccountRequest',
                requestId,
                { email: request.email, firstName: request.firstName }
            )
        } catch (e) {
            logger.error('Failed to log account request deletion:', e)
        }

        revalidatePath('/dashboard/settings')
        return { success: true, message: 'Demande supprimée.' }
    } catch (error: any) {
        return { success: false, message: error.message }
    }
}

export async function testUnraidDebugAction() {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const settings = await db.select().from(settingsTable).where(inArray(settingsTable.key, ['unraid_url', 'unraid_api_key']));

        const url = settings.find((s: any) => s.key === 'unraid_url')?.value;
        const apiKey = settings.find((s: any) => s.key === 'unraid_api_key')?.value;

        if (!url || !apiKey) {
            return { success: false, message: 'Configuration Unraid manquante dans la DB.' };
        }

        logger.info(`[Debug Unraid] Test manuel sur ${url}`);
        const service = new UnraidService(url, apiKey);
        const stats = await service.getStorageStats();

        if (stats) {
            return { 
                success: true, 
                message: `Connexion réussie ! Stockage : ${stats.used} / ${stats.total} (${stats.percent}%)` 
            };
        }

        return { success: false, message: 'Échec de la récupération des stats. Vérifiez les logs serveur.' };
    } catch (error) {
        logger.error('[testUnraidDebugAction] Error:', error);
        return { success: false, message: (error as Error).message };
    }
}

export async function importPlexHistoryAction() {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        logger.info(`[Action] Starting Plex history import`)
        
        const result = await importPlexHistory(db)
        
        revalidatePath('/dashboard/settings')
        revalidatePath('/dashboard')
        
        return { 
            success: true, 
            message: `Import réussi : ${result.imported} nouveaux éléments, ${result.skipped} ignorés.` 
        }
    } catch (error) {
        logger.error('[importPlexHistoryAction] Error:', error)
        return { 
            success: false, 
            message: (error as Error).message || 'Erreur lors de l\'importation' 
        }
    }
}

export async function testJellyseerrConnectionAction(url: string, key: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const service = new JellyseerrService(url, key)
        const success = await service.testConnection()
        
        return { 
            success, 
            message: success ? 'Connexion réussie !' : 'Échec de la connexion. Vérifiez l\'URL et la clé API.' 
        }
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}

export async function testProwlarrConnectionAction(url: string, key: string) {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
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
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}

export async function fixMissingTitlesAction() {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        const tmdb = await getTmdbServiceForUser()
        if (!tmdb) {
            throw new Error('Clé API TMDB manquante (vérifiez la configuration).')
        }
        
        const requests = await db.select().from(mediaRequests)

        let fixed = 0
        logger.info(`[fixMissingTitlesAction] Checking ${requests.length} requests`)

        for (const req of requests) {
            if (!req.tmdbId) continue
            
            // Check if title is missing or generic
            const isMissing = !req.title || 
                             req.title === 'Unknown Movie' || 
                             req.title === 'Unknown Show' || 
                             req.title === '' ||
                             req.title.toLowerCase().includes('unknown')

            if (!isMissing) continue

            logger.info(`[fixMissingTitlesAction] Fixing title for ${req.mediaType} ${req.tmdbId}`)
            const details = await tmdb.getDetails(parseInt(req.tmdbId), req.mediaType as 'movie' | 'tv')
            
            if (details) {
                const title = req.mediaType === 'movie' ? details.title : details.name
                if (title) {
                    await db.update(mediaRequests).set({ title }).where(eq(mediaRequests.id, req.id))
                    fixed++
                }
            }
        }

        revalidatePath('/dashboard/requests')
        
        return { 
            success: true, 
            message: `${fixed} titres de demandes ont été corrigés.` 
        }
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}

export async function importJellyseerrRequestsAction() {
    try {
        const user = await getCurrentUser()
        if (!user || user?.role !== 'admin') {
            throw new Error('Unauthorized')
        }

        // Delete all existing requests first as requested
        logger.info(`[Action] Deleting all requests`)
        await db.delete(mediaRequests)

        const result = await importJellyseerrRequests(db)
        
        // After import, run the fix titles action automatically
        logger.info(`[Action] Fixing missing titles`)
        await fixMissingTitlesAction()
        
        revalidatePath('/dashboard/requests')
        revalidatePath('/dashboard/settings')
        
        return { 
            success: true, 
            message: `Import réussi : ${result.imported} demandes importées.` 
        }
    } catch (error) {
        return { success: false, message: (error as Error).message }
    }
}
