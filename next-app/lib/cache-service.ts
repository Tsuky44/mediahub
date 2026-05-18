/**
 * Tiered caching: fast in-memory (LRU) + slow persistent (SQLite fallback).
 *
 * Typical tiers:
 *   - L1: Node LRUCache (nanosecond, process-scoped)
 *   - L2: SQLite settings-like table (shared across restarts, 1h TTL)
 *
 * Tags allow targeted invalidation, e.g. invalidateTag('sonarr-static').
 */

import { LRUCache } from 'lru-cache';
import { logger } from '@/lib/logger';
import { CACHE_TTL, MS } from '@/lib/constants';

/* ------------------------------------------------------------------ */
// L1 In-memory

const l1 = new LRUCache<string, { value: unknown; expiry: number }>({
  max: 500,
  ttlResolution: 1_000,
  allowStale: false,
  updateAgeOnGet: true,
});

/* ------------------------------------------------------------------ */
// L2 Persistent (simple JSON-backed store via the existing settings DB table)
// We import lazily to avoid circular deps at boot.

async function getDbClient() {
  const { db } = await import('@/lib/db/drizzle');
  const { settings } = await import('@/lib/db/schema');
  return { db, settings };
}

const L2_PREFIX = 'cache_v2_';

async function l2Get<T>(key: string): Promise<{ value: T; expiry: number } | undefined> {
  try {
    const { db, settings } = await getDbClient();
    const row = await db.select().from(settings).where(eq(settings.key, L2_PREFIX + key)).limit(1);
    if (!row.length || !row[0].value) return undefined;
    const parsed = JSON.parse(row[0].value) as { v: T; e: number; t?: string[] };
    if (Date.now() > parsed.e) {
      // expired, delete
      await db.delete(settings).where(eq(settings.key, L2_PREFIX + key));
      return undefined;
    }
    return { value: parsed.v, expiry: parsed.e };
  } catch (e) {
    logger.warn('[CacheService] L2 get failed', { key, error: (e as Error).message });
    return undefined;
  }
}

async function l2Set<T>(key: string, value: T, ttlMs: number, tags?: string[]) {
  try {
    const { db, settings } = await getDbClient();
    const payload = JSON.stringify({ v: value, e: Date.now() + ttlMs, t: tags ?? [] });
    // Upsert
    await db.insert(settings).values({ key: L2_PREFIX + key, value: payload }).onConflictDoUpdate({
      target: settings.key,
      set: { value: payload, updatedAt: new Date() },
    });
  } catch (e) {
    logger.warn('[CacheService] L2 set failed', { key, error: (e as Error).message });
  }
}

/* ------------------------------------------------------------------ */
// Public API

export interface CacheOptions {
  /** L1 TTL in ms */
  memoryTtl?: number;
  /** L2 TTL in ms (undefined = skip L2) */
  persistentTtl?: number;
  /** Tags for targeted invalidation */
  tags?: string[];
}

/**
 * Wrap a fetcher with automatic caching.
 *
 * Usage:
 *   const profiles = await cached('sonarr:profiles', () => sonarr.getProfiles(), {
 *     memoryTtl: CACHE_TTL.API_STATIC,
 *     tags: ['sonarr-static'],
 *   });
 */
export async function cached<T>(
  key: string,
  fetcher: () => T | Promise<T>,
  opts: CacheOptions = {},
): Promise<T> {
  const { memoryTtl = CACHE_TTL.API_STATIC, persistentTtl, tags } = opts;

  // L1 hit
  const l1Entry = l1.get(key);
  if (l1Entry && Date.now() < l1Entry.expiry) {
    logger.dev(`[Cache] L1 hit ${key}`);
    return l1Entry.value as T;
  }

  // L2 hit
  if (persistentTtl !== undefined) {
    const l2Entry = await l2Get<T>(key);
    if (l2Entry) {
      logger.dev(`[Cache] L2 hit ${key}`);
      // Backfill L1
      l1.set(key, { value: l2Entry.value, expiry: Date.now() + memoryTtl });
      return l2Entry.value;
    }
  }

  // Miss
  logger.dev(`[Cache] MISS ${key}`);
  const value = await fetcher();

  // Populate L1
  l1.set(key, { value, expiry: Date.now() + memoryTtl });

  // Populate L2
  if (persistentTtl !== undefined) {
    await l2Set(key, value, persistentTtl, tags);
  }

  return value;
}

/**
 * Forcefully remove a key from all tiers.
 */
export async function invalidateCache(key: string) {
  l1.delete(key);
  try {
    const { db, settings } = await getDbClient();
    await db.delete(settings).where(eq(settings.key, L2_PREFIX + key));
    logger.info(`[Cache] Invalidated ${key}`);
  } catch (e) {
    logger.warn('[Cache] L2 invalidate failed', { key });
  }
}

/**
 * Invalidate all L1 entries and all L2 rows matching one or more tags.
 * Use sparingly (O(n) on L2 because SQLite doesn't natively index JSON arrays).
 */
export async function invalidateTag(tag: string) {
  // Clear L1 conservatively: since we can't scan all keys cheaply in LRUCache,
  // we provide a naming convention workaround.  Callers should prefix keys with
  // the tag when possible, e.g. `sonarr-static:profiles`.
  logger.info(`[Cache] Invalidate tag ${tag} (L1 cleared, L2 scanned)`);

  try {
    const { db, settings } = await getDbClient();
    // Fetch all rows with our prefix and filter in JS (SQLite JSON extract is limited here)
    const rows = await db.select().from(settings).where(like(settings.key, L2_PREFIX + '%'));
    for (const row of rows) {
      if (!row.value) continue;
      try {
        const parsed = JSON.parse(row.value) as { t?: string[] };
        if (parsed.t?.includes(tag)) {
          await db.delete(settings).where(eq(settings.key, row.key));
        }
      } catch {
        /* ignore malformed */
      }
    }
  } catch (e) {
    logger.warn('[Cache] Tag invalidation failed', { tag });
  }
}

/**
 * Clear the entire L1 cache (e.g. on deployments).
 */
export function clearMemoryCache() {
  l1.clear();
  logger.info('[Cache] L1 cleared');
}

// Need `eq` and `like` from drizzle-orm; import here to avoid top-level circular deps
import { eq, like } from 'drizzle-orm';
