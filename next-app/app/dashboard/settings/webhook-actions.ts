'use server'

import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'

export async function getWebhooks() {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const ability = defineAbilityFor(user)
  if (!ability.can('manage', 'all') && user.role !== 'admin') {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const [setting] = await db.select().from(settings).where(eq(settings.key, 'external_webhooks')).limit(1)
    
    if (!setting || !setting.value) {
      return { success: true, webhooks: [] }
    }

    return { success: true, webhooks: JSON.parse(setting.value) }
  } catch (error) {
    console.error('Failed to get webhooks:', error)
    return { success: false, error: 'Internal error' }
  }
}

export async function saveWebhooks(webhooks: any[]) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const ability = defineAbilityFor(user)
  if (!ability.can('manage', 'all') && user.role !== 'admin') {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const [existing] = await db.select().from(settings).where(eq(settings.key, 'external_webhooks')).limit(1)
    if (existing) {
      await db.update(settings).set({ value: JSON.stringify(webhooks), category: 'notifications' }).where(eq(settings.key, 'external_webhooks'))
    } else {
      await db.insert(settings).values({ key: 'external_webhooks', value: JSON.stringify(webhooks), category: 'notifications' })
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to save webhooks:', error)
    return { success: false, error: 'Internal error' }
  }
}

export async function testWebhook(webhook: any, testType: 'movie' | 'tv' | 'default' = 'default', eventType: string = 'request_approved') {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const ability = defineAbilityFor(user)
  if (!ability.can('manage', 'all') && user.role !== 'admin') {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
    // On passe le user actuel pour pouvoir récupérer son discordUserId dans les données de test
    const result = await ExternalNotificationService.testWebhook(webhook, testType, eventType, user)
    return result
  } catch (error: any) {
    console.error('Failed to test webhook:', error)
    return { success: false, error: error.message || 'Internal error' }
  }
}
