'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function createInstance(data: {
  name: string
  slug: string
  embyUrl: string
  embyApiKey: string
}) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin' || !user.isDefaultInstance) {
    throw new Error("Seul l'administrateur de l'instance principale peut créer de nouvelles instances.")
  }

  const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const instance = await (prisma as any).instance.create({
    data: {
      name: data.name,
      slug,
      embyUrl: data.embyUrl,
      embyApiKey: data.embyApiKey,
      isDefault: false,
    }
  })

  revalidatePath('/dashboard/admin/instances')
  return instance
}

export async function deleteInstance(id: number) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin' || !user.isDefaultInstance) {
    throw new Error("Seul l'administrateur de l'instance principale peut supprimer des instances.")
  }

  const instance = await (prisma as any).instance.findUnique({ where: { id } })
  if (instance?.isDefault) {
    throw new Error("L'instance principale ne peut pas être supprimée.")
  }

  await (prisma as any).instance.delete({
    where: { id }
  })

  revalidatePath('/dashboard/admin/instances')
  return await (prisma as any).instance.findMany({
    orderBy: { createdAt: 'desc' }
  })
}

export async function createInviteCode() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin' || !user.isDefaultInstance) {
    throw new Error("Seul l'administrateur de l'instance principale peut créer des codes d'invitation.")
  }

  const code = Math.random().toString(36).substring(2, 10).toUpperCase()
  
  const invite = await (prisma as any).inviteCode.create({
    data: {
      code,
      instanceId: Number(user.instanceId),
    }
  })

  revalidatePath('/dashboard/admin/instances')
  return invite
}

export async function getInviteCodes() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin' || !user.isDefaultInstance) {
    throw new Error("Accès refusé.")
  }

  return await (prisma as any).inviteCode.findMany({
    where: { used: false },
    orderBy: { createdAt: 'desc' }
  })
}

export async function deleteInviteCode(id: number) {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin' || !user.isDefaultInstance) {
    throw new Error("Seul l'administrateur de l'instance principale peut supprimer des codes d'invitation.")
  }

  await (prisma as any).inviteCode.delete({
    where: { id }
  })

  revalidatePath('/dashboard/admin/instances')
}

export async function createInstanceWithInvite(data: {
  name: string
  slug: string
  embyUrl: string
  embyApiKey: string
  inviteCode: string
}) {
  // Check if this is the first instance (setup mode)
  const instanceCount = await (prisma as any).instance.count()
  const isFirstInstance = instanceCount === 0

  if (!isFirstInstance) {
    // Normal flow: require invite code
    if (!data.inviteCode) {
      throw new Error("Code d'invitation requis.")
    }

    const invite = await (prisma as any).inviteCode.findUnique({
      where: { code: data.inviteCode.toUpperCase(), used: false }
    })

    if (!invite) {
      throw new Error("Code d'invitation invalide ou déjà utilisé.")
    }

    // Mark invite as used after successful creation (transaction would be better but keeping it simple for now)
    await (prisma as any).inviteCode.update({
      where: { id: invite.id },
      data: { used: true }
    })
  }

  const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const existing = await (prisma as any).instance.findFirst({
    where: { OR: [{ name: data.name }, { slug }] }
  })

  if (existing) {
    throw new Error("Une instance avec ce nom ou ce slug existe déjà.")
  }

  const instance = await (prisma as any).instance.create({
    data: {
      name: data.name,
      slug,
      embyUrl: data.embyUrl,
      embyApiKey: data.embyApiKey,
      isDefault: isFirstInstance, // First instance is always default
    }
  })

  return { success: true, instance }
}
