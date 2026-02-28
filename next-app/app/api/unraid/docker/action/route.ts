
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


export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  const user = session?.user as any
  const ability = defineAbilityFor(user)

  if (!session || !ability.can('manage_containers', 'Docker')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { containerId, action } = body

    if (!containerId || !['start', 'stop', 'restart'].includes(action)) {
        return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Try direct Docker action first (more reliable)
    log(`[API] Attempting direct Docker action: ${action} on ${containerId}`)
    const dockerResult = await DockerService.containerAction(containerId, action)
    
    if (dockerResult.success) {
        return NextResponse.json({ success: true, method: 'docker' })
    }

    // Fallback to Unraid API if Docker action fails
    log(`[API] Docker action failed (${dockerResult.error}), falling back to Unraid API for ${action}`)
    const unraidUrlSetting = await prisma.setting.findFirst({ where: { key: 'unraid_url' } })
    const unraidApiKeySetting = await prisma.setting.findFirst({ where: { key: 'unraid_api_key' } })

    if (unraidUrlSetting?.value && unraidApiKeySetting?.value) {
        const unraidService = new UnraidService(unraidUrlSetting.value, unraidApiKeySetting.value)
        const unraidSuccess = await unraidService.containerAction(containerId, action)

        if (unraidSuccess) {
            return NextResponse.json({ success: true, method: 'unraid' })
        }
    }

    // Return the specific Docker error if Unraid also failed or wasn't configured
    return NextResponse.json({ error: dockerResult.error || 'Action failed on both Docker and Unraid API' }, { status: 500 })

  } catch (error: any) {
    error('[API] Error performing docker action:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
