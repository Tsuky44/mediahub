import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setSetting } from '@/lib/settings'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user || session.user.name !== 'mathis') {
    return NextResponse.json({ error: 'Unauthorized. Only mathis can manage settings.' }, { status: 401 })
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
        smb_path
    } = body

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
    ]

    for (const setting of settingsToUpdate) {
        if (setting.value !== undefined) {
            await setSetting(setting.key, setting.value)
        }
    }

    return NextResponse.json({ success: true })

  } catch (e) {
    console.error('Failed to update settings', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
