'use server'

import { prisma } from '@/lib/prisma'
import { importPlexHistory } from '@/lib/plex-import'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'

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
