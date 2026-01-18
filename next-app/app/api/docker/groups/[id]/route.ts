
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  const canManage = isAdmin || permissions.includes('docker.manage')

  if (!session || !canManage) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(prisma as any).dockerGroup) {
    return NextResponse.json({ error: 'Modèle DockerGroup non chargé' }, { status: 500 })
  }

  try {
    const { name, members } = await req.json()

    // Update group name and members
    // We use a transaction to replace members
    const group = await prisma.$transaction(async (tx: any) => {
      // 1. Update name if provided
      await tx.dockerGroup.update({
        where: { id },
        data: { name }
      })

      // 2. Delete existing members
      await tx.dockerGroupMember.deleteMany({
        where: { groupId: id }
      })

      // 3. Create new members
      if (members && members.length > 0) {
        await tx.dockerGroupMember.createMany({
          data: members.map((containerName: string) => ({
            groupId: id,
            containerName
          }))
        })
      }

      // 4. Return updated group
      return tx.dockerGroup.findUnique({
        where: { id },
        include: { members: true }
      })
    })

    return NextResponse.json({ group })
  } catch (error: any) {
    console.error('[API] Error updating docker group:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  const canManage = isAdmin || permissions.includes('docker.manage')

  if (!session || !canManage) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!(prisma as any).dockerGroup) {
    return NextResponse.json({ error: 'Modèle DockerGroup non chargé' }, { status: 500 })
  }

  try {
    await (prisma as any).dockerGroup.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[API] Error deleting docker group:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
