
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users, roles } from '@/lib/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { getSetting, setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { roleId } = await request.json()

    // Get current default role
    const currentDefaultRoleId = await getSetting('default_role_id')

    if (!roleId) {
      // Removing default role
      await setSetting('default_role_id', '')
      
      let updatedCount = 0
      if (currentDefaultRoleId) {
        log(`[RoleDefault] Removing default role. Migrating users from ${currentDefaultRoleId} to NULL`)
        const result = await db.update(users)
            .set({ roleId: null, updatedAt: new Date() })
            .where(eq(users.roleId, currentDefaultRoleId))
            .returning()
        updatedCount = result.length
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `RÃ´le par dÃ©faut supprimÃ©. ${updatedCount} utilisateurs mis Ã  jour (aucun rÃ´le).`,
        updatedCount 
      })
    }

    // Verify role exists
    const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) })
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Update setting
    await setSetting('default_role_id', roleId)

    let updatedCount = 0

    // If there was a previous default role, migrate users
    if (currentDefaultRoleId && currentDefaultRoleId !== roleId) {
      log(`[RoleDefault] Migrating users from role ${currentDefaultRoleId} to ${roleId}`)
      
      const result = await db.update(users)
        .set({ roleId: roleId, updatedAt: new Date() })
        .where(eq(users.roleId, currentDefaultRoleId))
        .returning()
      
      updatedCount = result.length
      log(`[RoleDefault] Migrated ${updatedCount} users`)
    } else if (!currentDefaultRoleId) {
      // Previous default was "None" (or basic user), so migrate users with no roleId
      log(`[RoleDefault] Migrating users from NULL role to ${roleId}`)
      
      const result = await db.update(users)
        .set({ roleId: roleId, updatedAt: new Date() })
        .where(and(
            isNull(users.roleId),
            eq(users.role, 'user')
        ))
        .returning()
      
      updatedCount = result.length
      log(`[RoleDefault] Migrated ${updatedCount} users`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `RÃ´le par dÃ©faut mis Ã  jour. ${updatedCount} utilisateurs migrÃ©s.`,
      updatedCount 
    })

  } catch (error: any) {
    error('[RoleDefault] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
