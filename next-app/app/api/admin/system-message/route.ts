import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { inArray, eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Get current system message settings
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settingsList = await db.query.settings.findMany({
    where: inArray(settings.key, ['system_message_content', 'system_message_enabled', 'system_message_version', 'welcome_message_enabled', 'login_banner_content', 'login_banner_enabled', 'login_banner_speed']),
    columns: {
      key: true,
      value: true
    }
  })

  const content = settingsList.find(s => s.key === 'system_message_content')?.value || ''
  const enabled = settingsList.find(s => s.key === 'system_message_enabled')?.value === 'true'
  const welcomeEnabled = settingsList.find(s => s.key === 'welcome_message_enabled') ? settingsList.find(s => s.key === 'welcome_message_enabled')?.value === 'true' : true // Default to true
  const version = settingsList.find(s => s.key === 'system_message_version')?.value || '0'
  const bannerContent = settingsList.find(s => s.key === 'login_banner_content')?.value || ''
  const bannerEnabled = settingsList.find(s => s.key === 'login_banner_enabled')?.value === 'true'
  const bannerSpeed = parseInt(settingsList.find(s => s.key === 'login_banner_speed')?.value || '20')

  return NextResponse.json({ content, enabled, welcomeEnabled, version, bannerContent, bannerEnabled, bannerSpeed })
}

// POST: Update system message settings
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { content, enabled, welcomeEnabled, bannerContent, bannerEnabled, bannerSpeed } = await request.json()

    // Get current version
    const currentVersionSetting = await db.query.settings.findFirst({
      where: eq(settings.key, 'system_message_version')
    })
    
    // Get current content to check if it changed
    const currentContentSetting = await db.query.settings.findFirst({
      where: eq(settings.key, 'system_message_content')
    })

    const currentContent = currentContentSetting?.value || ''
    let newVersion = currentVersionSetting?.value || '0'

    // If content changed or just enabled, we might want to bump version?
    // Requirement: "if I modify the message then it returns at the next connection"
    // So only if content changes, bump version.
    if (content !== currentContent) {
      newVersion = Date.now().toString()
    }

    // Upsert settings
    const settingsToUpsert = [
      { key: 'system_message_content', value: content, category: 'system' },
      { key: 'system_message_enabled', value: String(enabled), category: 'system' },
      { key: 'welcome_message_enabled', value: String(welcomeEnabled), category: 'system' },
      { key: 'system_message_version', value: newVersion, category: 'system' },
      { key: 'login_banner_content', value: bannerContent || '', category: 'system' },
      { key: 'login_banner_enabled', value: String(bannerEnabled), category: 'system' },
      { key: 'login_banner_speed', value: String(bannerSpeed || 20), category: 'system' }
    ]

    for (const setting of settingsToUpsert) {
      const existing = await db.query.settings.findFirst({
        where: eq(settings.key, setting.key)
      })
      if (existing) {
        await db.update(settings)
          .set({ value: setting.value, category: setting.category, updatedAt: new Date() })
          .where(eq(settings.key, setting.key))
      } else {
        await db.insert(settings).values({
          ...setting,
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    }

    return NextResponse.json({ success: true, version: newVersion })
  } catch (error: any) {
    console.error('Error updating system message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
