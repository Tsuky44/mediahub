
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UnraidService } from '@/lib/services/unraid'
import { DockerService } from '@/lib/services/docker'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  const canManage = isAdmin || permissions.includes('docker.manage')

  if (!session || !canManage) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { containerId, action } = body

    if (!containerId || !['start', 'stop', 'restart'].includes(action)) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Try direct Docker action first (more reliable)
    console.log(`[API] Attempting direct Docker action: ${action} on ${containerId}`)
    const dockerSuccess = await DockerService.containerAction(containerId, action)
    
    if (dockerSuccess) {
        return NextResponse.json({ success: true, method: 'docker' })
    }

    // Fallback to Unraid API if Docker action fails
    console.log(`[API] Docker action failed, falling back to Unraid API for ${action}`)
    const unraidUrlSetting = await prisma.setting.findFirst({ where: { key: 'unraid_url' } })
    const unraidApiKeySetting = await prisma.setting.findFirst({ where: { key: 'unraid_api_key' } })

    if (unraidUrlSetting?.value && unraidApiKeySetting?.value) {
        const unraidService = new UnraidService(unraidUrlSetting.value, unraidApiKeySetting.value)
        const unraidSuccess = await unraidService.containerAction(containerId, action)

        if (unraidSuccess) {
            return NextResponse.json({ success: true, method: 'unraid' })
        }
    }

    return NextResponse.json({ error: 'Action failed on both Docker and Unraid API' }, { status: 500 })

  } catch (error: any) {
    console.error('[API] Error performing docker action:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
