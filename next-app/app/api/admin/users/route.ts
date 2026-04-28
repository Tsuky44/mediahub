import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as { role?: string }).role === 'admin'
  const hasAccess = isSuperAdmin 
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { roleRef: true }
  })
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as { role?: string }).role === 'admin'
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { name, email, password, roleId } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { name }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email ou ce nom existe déjà' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Determine role
    let roleName = 'user'
    let finalRoleId = roleId

    if (roleId) {
        const role = await prisma.role.findUnique({ where: { id: roleId } })
        if (role) roleName = role.name
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: roleName,
        roleId: finalRoleId || null
      },
      include: { roleRef: true }
    })

    await logAction(
      parseInt(String((session.user as { id?: string | number }).id)),
      'CREATE',
      'User',
      newUser.id.toString(),
      { name, email, roleId }
    )

    try {
        const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
        await ExternalNotificationService.send('user_created', {
            title: 'Nouvel utilisateur',
            message: `L'utilisateur ${name} (${email}) a été créé manuellement par un administrateur.`,
            data: { name, email }
        })
    } catch (e) {
        console.error('Failed to send external notification for user creation:', e)
    }

    return NextResponse.json(newUser)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as { role?: string }).role === 'admin'
  const hasAccess = isSuperAdmin

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, role, roleId, whatsappNumber, telegramChatId, discordUserId, discordWebhook, customWebhook } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const userToUpdate = await prisma.user.findUnique({
    where: { 
      id: parseInt(id)
    }
  })

  if (!userToUpdate) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const dataToUpdate: Record<string, unknown> = {}
  if (role !== undefined) dataToUpdate.role = role
  if (roleId !== undefined) dataToUpdate.roleId = roleId
  if (whatsappNumber !== undefined) dataToUpdate.whatsappNumber = whatsappNumber || null
  if (telegramChatId !== undefined) dataToUpdate.telegramChatId = telegramChatId || null
  if (discordUserId !== undefined) dataToUpdate.discordUserId = discordUserId || null
  if (discordWebhook !== undefined) dataToUpdate.discordWebhook = discordWebhook || null
  if (customWebhook !== undefined) dataToUpdate.customWebhook = customWebhook || null

  const updatedUser = await prisma.user.update({
    where: { id: parseInt(id) },
    data: dataToUpdate,
    include: { roleRef: true }
  })

  await logAction(
    parseInt(String((session.user as { id?: string | number }).id)),
    'UPDATE',
    'User',
    id.toString(),
    { role, roleId }
  )

  return NextResponse.json(updatedUser)
}
