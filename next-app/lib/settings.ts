import { prisma } from '@/lib/prisma'

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  // 1. Check Environment Variables first for core settings
  const envKey = key.toUpperCase()
  if (process.env[envKey]) {
    return process.env[envKey] as string
  }

  // 2. Try to get from DB
  try {
    if (!prisma) {
      console.warn(`[getSetting] Prisma client not available`);
      return defaultValue;
    }
    const setting = await prisma.setting.findUnique({
      where: { key }
    })
    
    if (setting && setting.value) {
      return setting.value
    }
  } catch (e) {
    console.warn(`Failed to fetch setting ${key} from DB`, e)
  }
  
  return defaultValue
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  if (!prisma) {
    console.error(`[setSetting] Prisma client not available`);
    return;
  }
  
  // Ensure value is a string or null
  const safeValue = value === undefined ? null : value;
  
  const existing = await prisma.setting.findUnique({
    where: { key }
  })

  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: safeValue }
    })
  } else {
    await prisma.setting.create({
      data: { key, value: safeValue }
    })
  }
}
