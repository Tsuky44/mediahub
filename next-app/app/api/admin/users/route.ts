import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions, getEmbyServiceForUser } from '@/lib/auth'
import { PERMISSIONS } from '@/lib/permissions'
import { logAction } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  const userPermissions = (session.user as any).permissions || []
  const hasAccess = isSuperAdmin || userPermissions.includes(PERMISSIONS.USERS_VIEW) || userPermissions.includes(PERMISSIONS.USERS_MANAGE)

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const instanceId = parseInt((session.user as any).instanceId)
  if (isNaN(instanceId)) {
    return NextResponse.json({ error: 'Invalid instance' }, { status: 400 })
  }
  const embyService = await getEmbyServiceForUser()

  if (!embyService) {
    return NextResponse.json({ error: 'Emby service not configured' }, { status: 400 })
  }

  try {
    // Synchronize with Emby users
    const embyUsers = await embyService.getUsers()
    const systemInfo = await embyService.getSystemInfo()
    const baseUrl = systemInfo?.BaseUrl || ''
    
    if (embyUsers && Array.isArray(embyUsers)) {
      for (const embyUser of embyUsers) {
        // Create or update user in local DB
        const email = embyUser.Email || `${embyUser.Name.toLowerCase()}@emby.local`
        
        const existingUser = await (prisma as any).user.findFirst({
          where: { 
            embyUserId: embyUser.Id,
            instanceId
          }
        })

        if (existingUser) {
          await (prisma as any).user.update({
            where: { id: existingUser.id },
            data: {
              name: embyUser.Name,
              image: embyUser.PrimaryImageTag ? `${baseUrl}/Items/${embyUser.Id}/Images/Primary` : null,
            }
          })
        } else {
          await (prisma as any).user.create({
            data: {
              embyUserId: embyUser.Id,
              name: embyUser.Name,
              email: email,
              role: 'user', // Default role
              image: embyUser.PrimaryImageTag ? `${baseUrl}/Items/${embyUser.Id}/Images/Primary` : null,
              instanceId
            }
          })
        }
      }
    }
  } catch (error) {
    console.error('[Admin Users API] Sync failed:', error)
    // Continue even if sync fails to show existing users
  }

  const users = await (prisma as any).user.findMany({
    where: { instanceId },
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(users)
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  const userPermissions = (session.user as any).permissions || []
  const hasAccess = isSuperAdmin || userPermissions.includes(PERMISSIONS.USERS_MANAGE)

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const instanceId = parseInt((session.user as any).instanceId)
  if (isNaN(instanceId)) {
    return NextResponse.json({ error: 'Invalid instance' }, { status: 400 })
  }
  const { id, role, roleId } = await request.json()

  if (!id || (!role && !roleId)) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  // Ensure user belongs to the same instance
  const userToUpdate = await (prisma as any).user.findFirst({
    where: { 
      id: parseInt(id),
      instanceId
    }
  })

  if (!userToUpdate) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const updatedUser = await (prisma as any).user.update({
    where: { id: parseInt(id) },
    data: { 
      role: role || 'user',
      roleId: roleId || null,
      roleVersion: { increment: 1 }
    }
  })

  await logAction(
    parseInt((session.user as any).id),
    'UPDATE',
    'User',
    id.toString(),
    { role, roleId }
  )

  return NextResponse.json(updatedUser)
}
