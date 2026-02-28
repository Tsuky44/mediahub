
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSetting, setSetting } from '@/lib/settings'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
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
        const updateResult = await prisma.user.updateMany({
            where: { roleId: currentDefaultRoleId },
            data: { roleId: null }
        })
        updatedCount = updateResult.count
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Rôle par défaut supprimé. ${updatedCount} utilisateurs mis à jour (aucun rôle).`,
        updatedCount 
      })
    }

    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } })
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Update setting
    await setSetting('default_role_id', roleId)

    let updatedCount = 0

    // If there was a previous default role, migrate users
    if (currentDefaultRoleId && currentDefaultRoleId !== roleId) {
      log(`[RoleDefault] Migrating users from role ${currentDefaultRoleId} to ${roleId}`)
      
      const updateResult = await prisma.user.updateMany({
        where: { roleId: currentDefaultRoleId },
        data: { roleId: roleId }
      })
      
      updatedCount = updateResult.count
      log(`[RoleDefault] Migrated ${updatedCount} users`)
    } else if (!currentDefaultRoleId) {
      // Previous default was "None" (or basic user), so migrate users with no roleId
      log(`[RoleDefault] Migrating users from NULL role to ${roleId}`)
      
      const updateResult = await prisma.user.updateMany({
        where: { 
            roleId: null,
            role: 'user' // Only migrate non-admin users
        },
        data: { roleId: roleId }
      })
      
      updatedCount = updateResult.count
      log(`[RoleDefault] Migrated ${updatedCount} users`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Rôle par défaut mis à jour. ${updatedCount} utilisateurs migrés.`,
      updatedCount 
    })

  } catch (error: any) {
    error('[RoleDefault] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
