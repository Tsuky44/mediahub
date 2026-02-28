
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UnraidService } from '@/lib/services/unraid'
import { DockerService } from '@/lib/services/docker'
import { prisma } from '@/lib/prisma'
import { defineAbilityFor } from '@/lib/ability'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function GET() {
  const session = await getServerSession(authOptions)
  
  const user = session?.user as any
  const ability = defineAbilityFor(user)

  if (!session || !ability.can('read', 'Docker')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Try DockerService first for faster and more accurate state
    const dockerContainers = await DockerService.listContainers();
    if (dockerContainers) {
        return NextResponse.json({ containers: dockerContainers });
    }

    // Fallback to UnraidService
    log('[API] DockerService list failed, falling back to UnraidService');
    const unraidUrlSetting = await prisma.setting.findFirst({ where: { key: 'unraid_url' } })
    const unraidApiKeySetting = await prisma.setting.findFirst({ where: { key: 'unraid_api_key' } })

    if (!unraidUrlSetting?.value || !unraidApiKeySetting?.value) {
      return NextResponse.json({ error: 'Unraid settings not configured' }, { status: 400 })
    }

    const unraidService = new UnraidService(unraidUrlSetting.value, unraidApiKeySetting.value)
    const containers = await unraidService.getDockerContainers()

    return NextResponse.json({ containers })
  } catch (error: any) {
    error('[API] Error fetching docker containers:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
