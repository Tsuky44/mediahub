import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setSetting } from '@/lib/settings'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Only admins can manage settings.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('[Settings API] Received body:', JSON.stringify(body, null, 2))
    
    const sessionInstanceId = parseInt((session.user as any).instanceId)
    // Allow specifying an instanceId in the body, but fallback to session instanceId
    const instanceId = body.instanceId ? parseInt(body.instanceId) : sessionInstanceId
    
    if (isNaN(instanceId)) {
        return NextResponse.json({ error: 'Invalid instance' }, { status: 400 })
    }

    // Security check: only allow editing other instances if user is from the default instance
    if (instanceId !== sessionInstanceId) {
        const sessionInstance = await (prisma as any).instance.findUnique({ where: { id: sessionInstanceId } })
        if (!sessionInstance?.isDefault) {
            return NextResponse.json({ error: 'Unauthorized. Only main instance admins can manage other instances.' }, { status: 401 })
        }
    }

    const { 
        qbittorrent_url, 
        qbittorrent_username, 
        qbittorrent_password,
        smb_host,
        smb_username,
        smb_password,
        smb_share,
        smb_path,
        radarr_url,
        radarr_api_key,
        sonarr_url,
        sonarr_api_key,
        emby_url,
        emby_api_key,
        plex_url,
        plex_token,
        jellyfin_url,
        jellyfin_api_key,
        type
    } = body

    console.log(`[Settings API] Updating instance ${instanceId} with type ${type}`)

    // Update Instance core settings if provided
    if (emby_url !== undefined || emby_api_key !== undefined || 
        plex_url !== undefined || plex_token !== undefined ||
        jellyfin_url !== undefined || jellyfin_api_key !== undefined ||
        type !== undefined) {
      
      console.log('[Settings API] Core settings update detected')
      if (!prisma) {
        throw new Error("Prisma client non disponible");
      }
      
      const updateData: any = {}
      
      const setField = (key: string, value: any) => {
        if (value === undefined) return;
        // Convert empty string to null for optional fields
        updateData[key] = value === '' ? null : value;
      }

      setField('embyUrl', emby_url)
      setField('embyApiKey', emby_api_key)
      setField('plexUrl', plex_url)
      setField('plexToken', plex_token)
      setField('jellyfinUrl', jellyfin_url)
      setField('jellyfinApiKey', jellyfin_api_key)
      setField('type', type)
      
      console.log('[Settings API] updateData:', JSON.stringify(updateData, null, 2))
      
      try {
        await (prisma as any).instance.update({
          where: { id: instanceId },
          data: updateData
        })
        console.log('[Settings API] Instance core settings updated successfully')
      } catch (prismaError: any) {
        console.error('[Settings API] Prisma update error:', prismaError)
        throw new Error(`Erreur Prisma: ${prismaError.message}`);
      }
    }

    // Update Global Settings
    const settingsToUpdate = [
        { key: 'qbittorrent_url', value: qbittorrent_url },
        { key: 'qbittorrent_username', value: qbittorrent_username },
        { key: 'qbittorrent_password', value: qbittorrent_password },
        { key: 'smb_host', value: smb_host },
        { key: 'smb_username', value: smb_username },
        { key: 'smb_password', value: smb_password },
        { key: 'smb_share', value: smb_share },
        { key: 'smb_path', value: smb_path },
        { key: 'radarr_url', value: radarr_url },
        { key: 'radarr_api_key', value: radarr_api_key },
        { key: 'sonarr_url', value: sonarr_url },
        { key: 'sonarr_api_key', value: sonarr_api_key },
        { key: 'jellyseerr_url', value: body.jellyseerr_url },
        { key: 'jellyseerr_api_key', value: body.jellyseerr_api_key },
    ]

    for (const setting of settingsToUpdate) {
        if (setting.value !== undefined) {
            await setSetting(setting.key, instanceId, setting.value)
        }
    }

    return NextResponse.json({ success: true })

  } catch (e: any) {
    console.error('Failed to update settings:', e.message, e.stack)
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 })
  }
}
