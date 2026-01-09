'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function markWelcomeAsSeen() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Non authentifié' }

    try {
        await prisma.user.update({
            where: { id: parseInt(user.id) },
            data: { 
                // @ts-ignore
                hasSeenWelcome: true 
            }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('[Actions] Failed to mark welcome as seen:', error)
        return { success: false, error: 'Erreur lors de la mise à jour' }
    }
}
