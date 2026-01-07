import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { embyService } from '@/lib/services/emby'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
        
        const existingUser = await prisma.user.findFirst({
          where: { embyUserId: embyUser.Id }
        })

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: embyUser.Name,
              image: embyUser.PrimaryImageTag ? `${baseUrl}/Items/${embyUser.Id}/Images/Primary` : null,
            }
          })
        } else {
          await prisma.user.create({
            data: {
              embyUserId: embyUser.Id,
              name: embyUser.Name,
              email: email,
              role: 'user', // Default role
              image: embyUser.PrimaryImageTag ? `${baseUrl}/Items/${embyUser.Id}/Images/Primary` : null,
            }
          })
        }
      }
    }
  } catch (error) {
    console.error('[Admin Users API] Sync failed:', error)
    // Continue even if sync fails to show existing users
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(users)
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, role } = await request.json()

  if (!id || !role) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { 
      role,
      // @ts-ignore
      roleVersion: { increment: 1 }
    }
  })

  return NextResponse.json(updatedUser)
}
