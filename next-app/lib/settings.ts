import { prisma } from '@/lib/prisma'

// Cache in-memory pour éviter un hit DB à chaque appel getSetting().
// TTL: 30 secondes. Invalidé immédiatement lors d'un setSetting().
const settingsCache = new Map<string, { value: string; expiresAt: number }>()
const SETTINGS_CACHE_TTL_MS = 30_000

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  // 1. Variables d'environnement en priorité (jamais cachées)
  const envKey = key.toUpperCase()
  if (process.env[envKey]) {
    return process.env[envKey] as string
  }

  // 2. Cache in-memory
  const cached = settingsCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  // 3. Fallback DB
  try {
    if (!prisma) {
      console.warn(`[getSetting] Prisma client not available`);
      return defaultValue;
    }
    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true }
    })
    
    const value = (setting && setting.value) ? setting.value : defaultValue
    // On cache uniquement les valeurs non-vides
    if (value) {
      settingsCache.set(key, { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS })
    }
    return value
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

  // Invalider le cache immédiatement sur écriture
  settingsCache.delete(key)
  
  // Ensure value is a string or null
  const safeValue = value === undefined ? null : value;
  
  const existing = await prisma.setting.findUnique({
    where: { key },
    select: { id: true }
  })

  if (existing) {
    await prisma.setting.update({
      where: { id: existing.id },
      data: { value: safeValue },
      select: { id: true }
    })
  } else {
    await prisma.setting.create({
      data: { key, value: safeValue },
      select: { id: true }
    })
  }
}
