﻿﻿﻿﻿﻿
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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

    let dockerError = null;

    // Try direct Docker action first (more reliable)
    log(`[API] Attempting direct Docker action: ${action} on ${containerId}`)
    try {
        const dockerResult = await DockerService.containerAction(containerId, action)
        
        if (dockerResult.success) {
            try {
                const { logAction } = await import('@/lib/audit');
                await logAction(
                    parseInt(user.id),
                    'DOCKER_ACTION',
                    'Docker',
                    containerId,
                    { action, method: 'docker' }
                );
            } catch (e) {
                console.error('Failed to log docker action:', e);
            }
            return NextResponse.json({ success: true, method: 'docker' })
        }
        
        dockerError = dockerResult.error;
        // Only try Unraid fallback if Docker action failed AND returned an error
        log(`[API] Docker action failed (${dockerResult.error}), trying Unraid fallback...`)
    } catch (dockerErr: any) {
        dockerError = dockerErr.message;
        error(`[API] CRITICAL DockerService crash: ${dockerErr.message}`, dockerErr)
        // Continue to Unraid fallback
    }

    // Fallback to Unraid API if Docker action fails
    const [unraidUrlSetting] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'unraid_url')).limit(1)
    const [unraidApiKeySetting] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'unraid_api_key')).limit(1)

    if (unraidUrlSetting?.value && unraidApiKeySetting?.value) {
        try {
            const unraidService = new UnraidService(unraidUrlSetting.value, unraidApiKeySetting.value)
            const unraidSuccess = await unraidService.containerAction(containerId, action)

            if (unraidSuccess) {
                try {
                    const { logAction } = await import('@/lib/audit');
                    await logAction(
                        parseInt(user.id),
                        'DOCKER_ACTION',
                        'Docker',
                        containerId,
                        { action, method: 'unraid' }
                    );
                } catch (e) {
                    console.error('Failed to log docker action:', e);
                }
                return NextResponse.json({ success: true, method: 'unraid' })
            }
        } catch (unraidErr: any) {
             error(`[API] Unraid fallback failed: ${unraidErr.message}`)
        }
    }

    // Return a generic error if both failed, but ensure it's JSON
    return NextResponse.json({ 
        error: dockerError || 'Action failed on both Docker (socket) and Unraid API. Check server logs.' 
    }, { status: 500 })

  } catch (error: any) {
    error('[API] UNHANDLED EXCEPTION performing docker action:', error)
    return NextResponse.json({ 
        error: error.message || 'Internal Server Error (Unhandled)' 
    }, { status: 500 })
  }
}
