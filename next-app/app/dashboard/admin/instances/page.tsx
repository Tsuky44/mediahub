import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import InstancesClient from "./InstancesClient"

export const dynamic = 'force-dynamic'

export default async function InstancesPage() {
  const user = await getCurrentUser()

  if (!user || user.role !== 'admin' || !user.isDefaultInstance) {
    redirect('/dashboard')
  }

  const instances = await (prisma as any).instance.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-black text-white tracking-tight">Gestion des Instances</h2>
        <p className="text-gray-400">Créez et gérez des instances isolées pour vos amis.</p>
      </div>

      <InstancesClient initialInstances={instances} />
    </div>
  )
}
