import { prisma } from '@/lib/prisma'

export async function logAction(
  userId: number,
  action: string,
  entity: string,
  entityId: string,
  details?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw error to avoid blocking the main action
  }
}
