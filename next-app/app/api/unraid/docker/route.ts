
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UnraidService } from '@/lib/services/unraid'
import { DockerService } from '@/lib/services/docker'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  // Only allow admin or users with docker.view permission
  const user = session?.user as any
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'admin'
  const canView = isAdmin || permissions.includes('docker.view') || permissions.includes('docker.manage')

  if (!session || !canView) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try DockerService first for faster and more accurate state
    const dockerContainers = await DockerService.listContainers();
    if (dockerContainers) {
        return NextResponse.json({ containers: dockerContainers });
    }

    // Fallback to UnraidService
    console.log('[API] DockerService list failed, falling back to UnraidService');
    const unraidUrlSetting = await prisma.setting.findFirst({ where: { key: 'unraid_url' } })
    const unraidApiKeySetting = await prisma.setting.findFirst({ where: { key: 'unraid_api_key' } })

    if (!unraidUrlSetting?.value || !unraidApiKeySetting?.value) {
      return NextResponse.json({ error: 'Unraid settings not configured' }, { status: 400 })
    }

    const unraidService = new UnraidService(unraidUrlSetting.value, unraidApiKeySetting.value)
    const containers = await unraidService.getDockerContainers()

    return NextResponse.json({ containers })
  } catch (error: any) {
    console.error('[API] Error fetching docker containers:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
