
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { defineAbilityFor } from '@/lib/ability'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const ability = defineAbilityFor(user)

  if (!session || !ability.can('manage_groups', 'Docker')) {
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
      if (name) {
        await tx.dockerGroup.update({
          where: { id },
          data: { name }
        })
      }

      // 2. Update members if provided (replace all)
      if (members !== undefined) {
        // Delete existing members
        await tx.dockerGroupMember.deleteMany({
          where: { groupId: id }
        })

        // Create new members
        if (Array.isArray(members) && members.length > 0) {
          await tx.dockerGroupMember.createMany({
            data: members.map((containerName: string) => ({
              groupId: id,
              containerName
            }))
          })
        }
      }

      // 3. Return updated group
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
  const ability = defineAbilityFor(user)

  if (!session || !ability.can('manage_groups', 'Docker')) {
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
