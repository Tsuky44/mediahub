'use server'

import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function toggleSubscription(tmdbId: string, mediaType: string, title: string) {
    console.log(`[toggleSubscription] Starting for tmdbId=${tmdbId}, mediaType=${mediaType}, title=${title}`)
    try {
        const user = await getCurrentUser()
        if (!user) {
            console.error('[toggleSubscription] No user found')
            throw new Error('Unauthorized')
        }
        console.log(`[toggleSubscription] User ID: ${user.id}`)

        const userId = Number(user.id)
        if (isNaN(userId)) {
             console.error(`[toggleSubscription] Invalid user ID: ${user.id}`)
             throw new Error('Invalid User ID')
        }

        const existing = await prisma.mediaSubscription.findUnique({
            where: {
                userId_tmdbId_mediaType: {
                    userId,
                    tmdbId,
                    mediaType
                }
            }
        })
        console.log(`[toggleSubscription] Existing subscription:`, existing)

        if (existing) {
            await prisma.mediaSubscription.delete({
                where: { id: existing.id }
            })
            console.log(`[toggleSubscription] Deleted subscription ${existing.id}`)
        } else {
            await prisma.mediaSubscription.create({
                data: {
                    userId,
                    tmdbId,
                    mediaType,
                    title
                }
            })
            console.log(`[toggleSubscription] Created new subscription`)
        }

        console.log(`[toggleSubscription] Revalidating path...`)
        revalidatePath(`/dashboard/media/${tmdbId}`)
        console.log(`[toggleSubscription] Done. Returning ${!existing}`)
        return !existing
    } catch (error) {
        console.error('[toggleSubscription] Error:', error)
        throw error
    }
}

export async function getSubscriptionStatus(tmdbId: string, mediaType: string) {
    const user = await getCurrentUser()
    if (!user) return false

    const existing = await prisma.mediaSubscription.findUnique({
        where: {
            userId_tmdbId_mediaType: {
                userId: Number(user.id),
                tmdbId,
                mediaType
            }
        }
    })

    return !!existing
}
