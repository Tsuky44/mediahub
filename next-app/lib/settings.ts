import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { logger } from '@/lib/logger'

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
    if (!db) {
      logger.warn(`[getSetting] Database client not available`);
      return defaultValue;
    }
    const [setting] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, key))
    
    const value = (setting && setting.value) ? setting.value : defaultValue
    // On cache uniquement les valeurs non-vides
    if (value) {
      settingsCache.set(key, { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS })
    }
    return value
  } catch (e) {
    logger.warn(`Failed to fetch setting ${key} from DB`, e)
  }
  
  return defaultValue
}

/**
 * Lit plusieurs settings en UNE requête (valeurs DB brutes, sans priorité env ni cache).
 * Les clés absentes ou vides valent ''.
 */
export async function readSettings<K extends string>(keys: readonly K[]): Promise<Record<K, string>> {
  const result = Object.fromEntries(keys.map((k) => [k, ''])) as Record<K, string>
  if (!db || keys.length === 0) return result
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, keys as unknown as string[]))
  for (const row of rows) {
    if (row.value) result[row.key as K] = row.value
  }
  return result
}

// Helper for retry with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = 3,
  baseDelay = 100
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (e: unknown) {
      lastError = e;
      const errorMessage = e instanceof Error ? e.message : String(e);

      // Only retry on timeout or database locked errors
      const isRetryable =
        errorMessage.includes('timed out') ||
        errorMessage.includes('database is locked') ||
        errorMessage.includes('busy') ||
        errorMessage.includes('timeout');

      if (!isRetryable || attempt === maxRetries) {
        throw e;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`[setSetting] ${operationName} failed (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  if (!db) {
    logger.error(`[setSetting] Database client not available`);
    return;
  }

  // Invalider le cache immédiatement sur écriture
  settingsCache.delete(key);

  // Ensure value is a string or null
  const safeValue = value === undefined ? null : value;

  // Use insert or update with retry for atomic operation
  await withRetry(
    async () => {
      // Try to update first
      const result = await db.update(settings)
        .set({ value: safeValue, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .run();
      
      // If no rows updated, insert
      if (result.changes === 0) {
        await db.insert(settings)
          .values({ key, value: safeValue })
          .onConflictDoNothing()
          .run();
      }
    },
    `upsert setting "${key}"`,
    5,  // max 5 retries
    200 // base delay 200ms
  );
}
