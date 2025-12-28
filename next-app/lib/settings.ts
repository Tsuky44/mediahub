import { prisma } from '@/lib/prisma'

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  // Try to get from DB first
  try {
    const setting = await prisma.setting.findUnique({
      where: { key }
    })
    
    if (setting && setting.value) {
      return setting.value
    }
  } catch (e) {
    console.warn(`Failed to fetch setting ${key} from DB`, e)
  }
  
  // Fallback to Env vars
  const envKey = key.toUpperCase()
  if (process.env[envKey]) {
    return process.env[envKey] as string
  }
  
  return defaultValue
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
}
