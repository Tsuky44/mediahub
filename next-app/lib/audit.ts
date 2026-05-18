import { db } from '@/lib/db/drizzle'
import { auditLogs } from '@/lib/db/schema'
import { headers } from 'next/headers'

export async function logAction(
  userId: number | null,
  action: string,
  entity: string,
  entityId: string,
  details?: any
) {
  try {
    let ipAddress = 'unknown'
    let userAgent = 'unknown'

    try {
      const headersList = await headers()
      ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
      userAgent = headersList.get('user-agent') || 'unknown'
    } catch (e) {
      // In some contexts (like next-auth events outside request scope), headers() might throw
    }

    const logDetails = {
      ...(details || {})
    };

    await db.insert(auditLogs).values({
      userId,
      action,
      entity,
      entityId,
      ipAddress,
      userAgent,
      details: Object.keys(logDetails).length > 0 ? JSON.stringify(logDetails) : null
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw error to avoid blocking the main action
  }
}

