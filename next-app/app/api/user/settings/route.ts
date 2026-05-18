import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setSetting } from '@/lib/settings'
import { logAction } from '@/lib/audit'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const isSuperAdmin = (session.user as any).role === 'admin'
  const hasAccess = isSuperAdmin

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
  }

  try {
    const body = await request.json()
    log('[Settings API] Received body:', JSON.stringify(body, null, 2))
    
    const {
        qbittorrent_url,
        qbittorrent_username,
        qbittorrent_password,
        qbittorrent_poll_interval,
        smb_host,
        smb_username,
        smb_password,
        smb_share,
        smb_path,
        // FTP/Unified Storage settings
        storage_protocol,
        storage_host,
        storage_port,
        storage_username,
        storage_password,
        storage_share,
        storage_root_path,
        storage_secure,
        radarr_url,
        radarr_api_key,
        sonarr_url,
        sonarr_api_key,
        prowlarr_url,
        prowlarr_api_key,
        emby_url,
        emby_api_key,
        plex_url,
        plex_token,
        jellyfin_url,
        jellyfin_api_key,
        auth_emby_enabled,
        auth_plex_enabled,
        auth_jellyfin_enabled,
        auth_local_enabled,
        unraid_url,
        unraid_api_key,
        docker_host,
        type,
        request_all_seasons_enabled
    } = body

    // Update settings in DB
    const updateSetting = async (key: string, value: any) => {
        if (value !== undefined) {
            // Convert boolean to string
            if (typeof value === 'boolean') {
                await setSetting(key, String(value))
            } else {
                await setSetting(key, value === '' ? null : value)
            }
        }
    }

    await updateSetting('qbittorrent_url', qbittorrent_url)
    await updateSetting('qbittorrent_username', qbittorrent_username)
    await updateSetting('qbittorrent_password', qbittorrent_password)
    await updateSetting('qbittorrent_poll_interval', qbittorrent_poll_interval)
    
    await updateSetting('smb_host', smb_host)
    await updateSetting('smb_username', smb_username)
    await updateSetting('smb_password', smb_password)
    await updateSetting('smb_share', smb_share)
    await updateSetting('smb_path', smb_path)
    
    // FTP/Unified Storage settings
    await updateSetting('storage_protocol', storage_protocol)
    await updateSetting('storage_host', storage_host)
    await updateSetting('storage_port', storage_port)
    await updateSetting('storage_username', storage_username)
    await updateSetting('storage_password', storage_password)
    await updateSetting('storage_share', storage_share)
    await updateSetting('storage_root_path', storage_root_path)
    await updateSetting('storage_secure', storage_secure)
    
    await updateSetting('radarr_url', radarr_url)
    await updateSetting('radarr_api_key', radarr_api_key)
    
    await updateSetting('sonarr_url', sonarr_url)
    await updateSetting('sonarr_api_key', sonarr_api_key)
    
    await updateSetting('prowlarr_url', prowlarr_url)
    await updateSetting('prowlarr_api_key', prowlarr_api_key)
    
    await updateSetting('emby_url', emby_url)
    await updateSetting('emby_api_key', emby_api_key)
    
    await updateSetting('plex_url', plex_url)
    await updateSetting('plex_token', plex_token)
    
    await updateSetting('jellyfin_url', jellyfin_url)
    await updateSetting('jellyfin_api_key', jellyfin_api_key)
    
    await updateSetting('auth_emby_enabled', auth_emby_enabled)
    await updateSetting('auth_plex_enabled', auth_plex_enabled)
    await updateSetting('auth_jellyfin_enabled', auth_jellyfin_enabled)
    await updateSetting('auth_local_enabled', auth_local_enabled)
    await updateSetting('request_all_seasons_enabled', request_all_seasons_enabled)

    await updateSetting('unraid_url', unraid_url)
    await updateSetting('unraid_api_key', unraid_api_key)
    
    await updateSetting('docker_host', docker_host)
    
    await updateSetting('type', type)

    await logAction(
        parseInt((session.user as any).id),
        'UPDATE_SETTINGS',
        'SYSTEM',
        'global',
        { message: 'Updated system settings' }
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    error('[Settings API] Error:', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
