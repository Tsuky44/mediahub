'use server'

import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'

export async function markWelcomeAsSeen() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: 'Non authentifié' }

    try {
        await db.update(users)
            .set({
                hasSeenWelcome: true,
                updatedAt: new Date()
            })
            .where(eq(users.id, parseInt(user.id)))
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        logger.error('[Actions] Failed to mark welcome as seen:', error)
        return { success: false, error: 'Erreur lors de la mise à jour' }
    }
}
