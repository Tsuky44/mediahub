
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { UnraidService } from '@/lib/services/unraid'
import { DockerService } from '@/lib/services/docker'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { defineAbilityFor } from '@/lib/ability'

export const dynamic = 'force-dynamic'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function GET() {
  const session = await getSession()
  
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
    const unraidUrlSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'unraid_url'), columns: { value: true } })
    const unraidApiKeySetting = await db.query.settings.findFirst({ where: eq(settings.key, 'unraid_api_key'), columns: { value: true } })

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
