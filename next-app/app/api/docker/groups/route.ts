
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  const canView = isAdmin || permissions.includes('docker.view') || permissions.includes('docker.manage')
  
  if (!session || !canView) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const groups = await (prisma as any).dockerGroup.findMany({
      include: {
        members: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({ groups })
  } catch (error: any) {
    console.error('[API] Error fetching docker groups:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  const canManage = isAdmin || permissions.includes('docker.manage')

  if (!session || !canManage) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, members } = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const group = await (prisma as any).dockerGroup.create({
      data: {
        name,
        members: {
          create: members?.map((containerName: string) => ({
            containerName
          })) || []
        }
      },
      include: {
        members: true
      }
    })

    return NextResponse.json({ group })
  } catch (error: any) {
    console.error('[API] Error creating docker group:', error)
    return NextResponse.json({ error: `Erreur serveur: ${error.message}` }, { status: 500 })
  }
}
