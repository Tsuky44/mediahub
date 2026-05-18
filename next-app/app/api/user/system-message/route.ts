import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { settings, users } from '@/lib/db/schema'
import { inArray, eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Get current system message if available and unseen
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // 'banner' or 'popup' (default)

  try {
    // BANNER MESSAGE (Pre-login)
    if (type === 'banner') {
      const settingsList = await db.query.settings.findMany({
        where: inArray(settings.key, ['login_banner_content', 'login_banner_enabled', 'login_banner_speed']),
        columns: {
          key: true,
          value: true
        }
      })

      const content = settingsList.find(s => s.key === 'login_banner_content')?.value || ''
      const enabled = settingsList.find(s => s.key === 'login_banner_enabled')?.value === 'true'
      const speed = parseInt(settingsList.find(s => s.key === 'login_banner_speed')?.value || '20')

      return NextResponse.json({ 
        show: enabled && !!content, 
        content,
        speed
      })
    }

    // POPUP MESSAGE (Post-login)
    // 1. Get system message settings
    const settingsList = await db.query.settings.findMany({
      where: inArray(settings.key, ['system_message_content', 'system_message_enabled', 'system_message_version']),
      columns: {
        key: true,
        value: true
      }
    })

    const content = settingsList.find(s => s.key === 'system_message_content')?.value || ''
    const enabled = settingsList.find(s => s.key === 'system_message_enabled')?.value === 'true'
    const currentVersion = settingsList.find(s => s.key === 'system_message_version')?.value || '0'

    if (!enabled || !content) {
      return NextResponse.json({ show: false })
    }

    // If not authenticated, we can't check seen status, so don't show popup
    // (Popup is strictly for logged-in users now that we have a banner)
    if (!session?.user) {
      return NextResponse.json({ show: false })
    }

    // 2. Get user's last seen version
    const userId = parseInt((session.user as any).id)
    
    if (isNaN(userId)) {
      console.error('Invalid user ID in session:', (session.user as any).id)
      // If ID is invalid, default to showing the message to be safe
      return NextResponse.json({ 
        show: true, 
        content, 
        version: currentVersion 
      })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { lastSeenSystemMessageVersion: true }
    })

    const lastSeenVersion = user?.lastSeenSystemMessageVersion || '0'

    // 3. Compare versions
    if (currentVersion !== lastSeenVersion) {
      return NextResponse.json({ 
        show: true, 
        content, 
        version: currentVersion 
      })
    }

    return NextResponse.json({ show: false })

  } catch (error: any) {
    console.error('Error fetching system message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Acknowledge (mark as seen) the current system message
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { version } = await request.json()

    if (!version) {
      return NextResponse.json({ error: 'Version is required' }, { status: 400 })
    }

    await db.update(users)
      .set({ lastSeenSystemMessageVersion: version, updatedAt: new Date() })
      .where(eq(users.id, parseInt((session.user as any).id)))

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error acknowledging system message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
