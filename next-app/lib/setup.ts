import { prisma } from '@/lib/prisma'

export async function isAppConfigured() {
  try {
    // Check if global settings are configured (specifically Emby URL)
    const setting = await prisma.setting.findFirst({
      where: { key: 'emby_url' },
      select: { value: true }
    })
    return !!setting?.value
  } catch (err) {
    console.error('Failed to check app configuration:', err)
    return false
  }
}
