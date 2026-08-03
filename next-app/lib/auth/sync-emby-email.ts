import { db } from '@/lib/db/drizzle'
import { users, settings as settingsTable } from '@/lib/db/schema'
import { and, isNotNull, or, like, eq } from 'drizzle-orm'
import { EmbyService } from '@/lib/services/emby'
import { isPlaceholderEmail, resolveEmbyUserEmail } from '@/lib/auth/user-email'

const SYNC_INTERVAL_MS = 5 * 60 * 1000
let lastSyncAt = 0
let syncInFlight: Promise<void> | null = null

/**
 * Corrige les emails @local des comptes Emby déjà en base.
 * AuthenticateByName ne renvoie pas toujours l'email au premier login.
 */
export async function syncStaleEmbyUserEmails(): Promise<void> {
  if (Date.now() - lastSyncAt < SYNC_INTERVAL_MS) return
  if (syncInFlight) return syncInFlight

  syncInFlight = (async () => {
    lastSyncAt = Date.now()

    try {
      const staleUsers = await db
        .select({ id: users.id, email: users.email, embyUserId: users.embyUserId })
        .from(users)
        .where(
          and(
            isNotNull(users.embyUserId),
            or(like(users.email, '%@local'), like(users.email, '%@emby.local'))
          )
        )
        .limit(25)

      if (staleUsers.length === 0) return

      const settingsRows = await db
        .select()
        .from(settingsTable)
        .where(or(eq(settingsTable.key, 'emby_url'), eq(settingsTable.key, 'emby_api_key')))

      const embyUrl = settingsRows.find(s => s.key === 'emby_url')?.value || process.env.EMBY_URL
      const embyApiKey = settingsRows.find(s => s.key === 'emby_api_key')?.value || process.env.EMBY_API_KEY
      if (!embyUrl || !embyApiKey) return

      const embyService = new EmbyService(embyUrl, embyApiKey)

      for (const user of staleUsers) {
        if (!user.embyUserId || !isPlaceholderEmail(user.email)) continue

        try {
          const profile = await embyService.getUser(user.embyUserId)
          const resolvedEmail = resolveEmbyUserEmail(profile)
          if (!resolvedEmail || resolvedEmail === user.email) continue

          const [conflict] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, resolvedEmail))
            .limit(1)

          if (conflict && conflict.id !== user.id) continue

          await db.update(users).set({ email: resolvedEmail }).where(eq(users.id, user.id))
        } catch {
          // Ignorer les erreurs unitaires pour ne pas bloquer l'UI
        }
      }
    } catch {
      // Sync best-effort
    } finally {
      syncInFlight = null
    }
  })()

  return syncInFlight
}
