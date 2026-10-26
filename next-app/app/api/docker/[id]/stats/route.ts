import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { DockerService } from '@/lib/services/docker'
import { defineAbilityFor } from '@/lib/ability'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  
  // Check auth
  const user = session?.user as any
  const ability = defineAbilityFor(user)

  if (!session || !ability.can('read_details', 'Docker')) {
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
