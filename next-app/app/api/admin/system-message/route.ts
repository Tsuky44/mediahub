import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET: Get current system message settings
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['system_message_content', 'system_message_enabled', 'system_message_version', 'welcome_message_enabled', 'login_banner_content', 'login_banner_enabled', 'login_banner_speed']
      }
    },
    select: {
      key: true,
      value: true
    }
  })

  const content = settings.find(s => s.key === 'system_message_content')?.value || ''
  const enabled = settings.find(s => s.key === 'system_message_enabled')?.value === 'true'
  const welcomeEnabled = settings.find(s => s.key === 'welcome_message_enabled') ? settings.find(s => s.key === 'welcome_message_enabled')?.value === 'true' : true // Default to true
  const version = settings.find(s => s.key === 'system_message_version')?.value || '0'
  const bannerContent = settings.find(s => s.key === 'login_banner_content')?.value || ''
  const bannerEnabled = settings.find(s => s.key === 'login_banner_enabled')?.value === 'true'
  const bannerSpeed = parseInt(settings.find(s => s.key === 'login_banner_speed')?.value || '20')

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
    const currentVersionSetting = await prisma.setting.findUnique({
      where: { key: 'system_message_version' }
    })
    
    // Get current content to check if it changed
    const currentContentSetting = await prisma.setting.findUnique({
      where: { key: 'system_message_content' }
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
    await prisma.$transaction([
      prisma.setting.upsert({
        where: { key: 'system_message_content' },
        update: { value: content },
        create: { key: 'system_message_content', value: content, category: 'system' }
      }),
      prisma.setting.upsert({
        where: { key: 'system_message_enabled' },
        update: { value: String(enabled) },
        create: { key: 'system_message_enabled', value: String(enabled), category: 'system' }
      }),
      prisma.setting.upsert({
        where: { key: 'welcome_message_enabled' },
        update: { value: String(welcomeEnabled) },
        create: { key: 'welcome_message_enabled', value: String(welcomeEnabled), category: 'system' }
      }),
      prisma.setting.upsert({
        where: { key: 'system_message_version' },
        update: { value: newVersion },
        create: { key: 'system_message_version', value: newVersion, category: 'system' }
      }),
      prisma.setting.upsert({
        where: { key: 'login_banner_content' },
        update: { value: bannerContent || '' },
        create: { key: 'login_banner_content', value: bannerContent || '', category: 'system' }
      }),
      prisma.setting.upsert({
        where: { key: 'login_banner_enabled' },
        update: { value: String(bannerEnabled) },
        create: { key: 'login_banner_enabled', value: String(bannerEnabled), category: 'system' }
      }),
      prisma.setting.upsert({
        where: { key: 'login_banner_speed' },
        update: { value: String(bannerSpeed || 20) },
        create: { key: 'login_banner_speed', value: String(bannerSpeed || 20), category: 'system' }
      })
    ])

    return NextResponse.json({ success: true, version: newVersion })
  } catch (error: any) {
    console.error('Error updating system message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
