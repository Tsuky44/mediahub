import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function isAppConfigured() {
  try {
    // Check if global settings are configured (specifically Emby URL)
    const setting = await db.query.settings.findFirst({
      where: eq(settings.key, 'emby_url'),
      columns: { value: true }
    })
    return !!setting?.value
  } catch (err) {
    console.error('Failed to check app configuration:', err)
    return false
  }
}
