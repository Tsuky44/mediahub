import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DockerService } from '@/lib/services/docker'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  // Check auth
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  const canView = isAdmin || permissions.includes('docker.view') || permissions.includes('docker.manage')

  if (!session || !canView) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await DockerService.getContainerStats(id)
    
    if (!stats) {
       return NextResponse.json({ error: 'Stats unavailable' }, { status: 404 })
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('[API] Error fetching docker stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
