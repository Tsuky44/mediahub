import { prisma } from '@/lib/prisma'

export async function getSetting(key: string, instanceId: number, defaultValue: string = ''): Promise<string> {
  // Try to get from DB first
  try {
    if (!prisma || !(prisma as any).setting) {
      console.warn(`[getSetting] Prisma or Setting model not available`);
      return defaultValue;
    }
    const setting = await (prisma as any).setting.findFirst({
      where: { key, instanceId }
    })
    
    if (setting && setting.value) {
      return setting.value
    }
  } catch (e) {
    console.warn(`Failed to fetch setting ${key} from DB`, e)
  }
  
  // Fallback to Instance table for core fields
  try {
    const instance = await (prisma as any).instance.findUnique({
      where: { id: instanceId },
      select: { 
        isDefault: true,
        embyUrl: true,
        embyApiKey: true,
        jellyseerrUrl: true,
        jellyseerrApiKey: true
      }
    })
    
    if (instance) {
      if (key === 'emby_url' && instance.embyUrl) return instance.embyUrl
      if (key === 'emby_api_key' && instance.embyApiKey) return instance.embyApiKey
      if (key === 'jellyseerr_url' && instance.jellyseerrUrl) return instance.jellyseerrUrl
      if (key === 'jellyseerr_api_key' && instance.jellyseerrApiKey) return instance.jellyseerrApiKey

      if (instance.isDefault) {
        const envKey = key.toUpperCase()
        if (process.env[envKey]) {
          return process.env[envKey] as string
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to check instance ${instanceId} for core settings`, e)
  }
  
  return defaultValue
}

export async function setSetting(key: string, instanceId: number, value: string): Promise<void> {
  if (!prisma || !(prisma as any).setting) {
    console.error(`[setSetting] Prisma or Setting model not available`);
    return;
  }
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
