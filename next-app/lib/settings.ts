import { prisma } from '@/lib/prisma'

export async function getSetting(key: string, instanceId: number, defaultValue: string = ''): Promise<string> {
  // Try to get from DB first
  try {
    const setting = await (prisma as any).setting.findFirst({
      where: { key, instanceId }
    })
    
    if (setting && setting.value) {
      return setting.value
    }
  } catch (e) {
    console.warn(`Failed to fetch setting ${key} from DB`, e)
  }
  
  // Fallback to Env vars ONLY for the default instance
  try {
    const instance = await (prisma as any).instance.findUnique({
      where: { id: instanceId },
      select: { isDefault: true }
    })
    
    if (instance?.isDefault) {
      const envKey = key.toUpperCase()
      if (process.env[envKey]) {
        return process.env[envKey] as string
      }
    }
  } catch (e) {
    console.warn(`Failed to check if instance ${instanceId} is default`, e)
  }
  
  return defaultValue
}

export async function setSetting(key: string, instanceId: number, value: string): Promise<void> {
  const existing = await (prisma as any).setting.findFirst({
    where: { key, instanceId }
  })

  if (existing) {
    await (prisma as any).setting.update({
      where: { id: existing.id },
      data: { value }
    })
  } else {
    await (prisma as any).setting.create({
      data: { key, value, instanceId }
    })
  }
}
