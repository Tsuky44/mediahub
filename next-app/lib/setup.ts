import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { and, inArray, isNotNull, ne } from 'drizzle-orm'

const SETUP_MARKER_KEYS = ['setup_complete', 'emby_url', 'jellyfin_url'] as const

export async function isAppConfigured() {
  try {
    // Ne pas utiliser findFirst sur un OR : une ligne URL vide (ex. emby_url
    // créée par une sauvegarde des paramètres) peut masquer jellyfin_url valide.
    const rows = await db
      .select({ value: settings.value })
      .from(settings)
      .where(
        and(
          inArray(settings.key, [...SETUP_MARKER_KEYS]),
          isNotNull(settings.value),
          ne(settings.value, ''),
        ),
      )

    return rows.some((row) => !!row.value?.trim())
  } catch (err) {
    console.error('Failed to check app configuration:', err)
    return false
  }
}
