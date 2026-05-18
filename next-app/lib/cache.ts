import { LRUCache } from 'lru-cache'

// Options for the cache
const options = {
  max: 500, // Maximum number of items
  ttl: 1000 * 60 * 5, // 5 minutes TTL
}

// Wrapper object to satisfy lru-cache v11 generic constraints (V extends {})
// while preserving any value type via the `value` property
const cache = new LRUCache<string, { value: unknown }>(options)

export { cache }

export async function remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
  if (cache.has(key)) {
    return cache.get(key)!.value as T
  }

  const value = await callback()
  cache.set(key, { value }, { ttl })
  return value
}

export function forget(key: string) {
    cache.delete(key)
}
