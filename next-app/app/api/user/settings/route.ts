import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setSetting } from '@/lib/settings'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized. Only admins can manage settings.' }, { status: 401 })
  }

  const instanceId = parseInt((session.user as any).instanceId)
  if (isNaN(instanceId)) {
    return NextResponse.json({ error: 'Invalid instance' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { 
        jellyseerrUserId, 
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
        jellystat_url,
        jellystat_api_key,
        emby_url,
        emby_api_key
    } = body

    // Update Instance core settings if provided
    if (emby_url || emby_api_key || body.jellyseerr_url || body.jellyseerr_api_key) {
      const updateData: any = {}
      if (emby_url) updateData.embyUrl = emby_url
      if (emby_api_key) updateData.embyApiKey = emby_api_key
      if (body.jellyseerr_url) updateData.jellyseerrUrl = body.jellyseerr_url
      if (body.jellyseerr_api_key) updateData.jellyseerrApiKey = body.jellyseerr_api_key
      
      await (prisma as any).instance.update({
        where: { id: instanceId },
        data: updateData
      })
    }

    // Update Global Settings
    const settingsToUpdate = [
        { key: 'jellyseerr_user_id', value: jellyseerrUserId },
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
        { key: 'jellystat_url', value: jellystat_url },
        { key: 'jellystat_api_key', value: jellystat_api_key },
    ]

    for (const setting of settingsToUpdate) {
        if (setting.value !== undefined) {
            await setSetting(setting.key, instanceId, setting.value)
        }
    }

    return NextResponse.json({ success: true })

  } catch (e) {
    console.error('Failed to update settings', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
