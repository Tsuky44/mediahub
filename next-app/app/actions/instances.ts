'use server'

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function createInstance(data: {
  name: string
  slug: string
  embyUrl: string
  embyApiKey: string
  jellyseerrUrl?: string
  jellyseerrApiKey?: string
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
      jellyseerrUrl: data.jellyseerrUrl,
      jellyseerrApiKey: data.jellyseerrApiKey,
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
}

export async function getInstances() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin' || !user.isDefaultInstance) {
    throw new Error("Accès refusé.")
  }

  return await (prisma as any).instance.findMany({
    orderBy: { createdAt: 'desc' }
  })
}
