﻿﻿﻿﻿﻿import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { users, roles } from '@/lib/db/schema'
import { eq, or, asc } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = session.user?.role === 'admin'
  const hasAccess = isSuperAdmin 
  
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const usersList = await db.select().from(users).orderBy(asc(users.name))
  // TODO: Fetch roles separately if needed
  return NextResponse.json(usersList)
}

export async function POST(request: Request) {
  const session = await getSession()
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = session.user?.role === 'admin'
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { name, email, password, roleId } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.select().from(users).where(
      or(eq(users.email, email), eq(users.name, name))
    ).limit(1)

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json({ error: 'Un utilisateur avec cet email ou ce nom existe dÃ©jÃ ' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Determine role
    let roleName = 'user'
    let finalRoleId = roleId

    if (roleId) {
        const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
        if (role) roleName = role.name
    }

    const [newUser] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: roleName,
      roleId: finalRoleId || null
    }).returning()

    await logAction(
      parseInt(session.user?.id ?? '0'),
      'CREATE',
      'User',
      newUser.id.toString(),
      { name, email, roleId }
    )

    // V1 notifications supprimées - plus d'envoi de notifications externes
    logger.info(`[Users] User ${name} (${email}) created manually by admin - V1 notifications removed`)

    return NextResponse.json(newUser)
  } catch (error) {
    logger.error('Error creating user:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isSuperAdmin = session.user?.role === 'admin'
  const hasAccess = isSuperAdmin

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, role, roleId, whatsappNumber, telegramChatId, discordUserId, discordWebhook, customWebhook } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const [userToUpdate] = await db.select().from(users).where(eq(users.id, parseInt(id))).limit(1)

  if (!userToUpdate) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const dataToUpdate: Partial<typeof users.$inferInsert> = {}
  if (role !== undefined) dataToUpdate.role = role
  if (roleId !== undefined) dataToUpdate.roleId = roleId ?? null
  if (whatsappNumber !== undefined) dataToUpdate.whatsappNumber = whatsappNumber || null
  if (telegramChatId !== undefined) dataToUpdate.telegramChatId = telegramChatId || null
  if (discordUserId !== undefined) dataToUpdate.discordUserId = discordUserId || null
  if (discordWebhook !== undefined) dataToUpdate.discordWebhook = discordWebhook || null
  if (customWebhook !== undefined) dataToUpdate.customWebhook = customWebhook || null

  const [updatedUser] = await db.update(users).set(dataToUpdate).where(eq(users.id, parseInt(id))).returning()

  await logAction(
    parseInt(session.user?.id ?? '0'),
    'UPDATE',
    'User',
    id.toString(),
    { role, roleId }
  )

  return NextResponse.json(updatedUser)
}
