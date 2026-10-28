import { LRUCache } from 'lru-cache'

// ---------------------------------------------------------------------------
// Cache mémoire générique (process-scoped)
// - LRU + TTL
// - Déduplication des appels en vol : N appels concurrents sur la même clé
//   ne déclenchent qu'UN seul fetch (évite les rafales vers les API externes).
// - Stale-while-revalidate : une valeur expirée depuis peu est servie tout de
//   suite pendant qu'elle est rafraîchie en arrière-plan. Une page ne paie donc
//   jamais l'aller-retour vers Emby, TMDB ou les *arr juste parce que son cache
//   vient d'expirer. `delete` (forget) force toujours une lecture fraîche.
// ---------------------------------------------------------------------------

export interface MemoCacheOptions {
  /** Nombre maximum d'entrées */
  max: number
  /** TTL par défaut (ms) : durée pendant laquelle la valeur est considérée fraîche */
  ttl: number
  /**
   * Retourne une copie profonde à chaque lecture. À activer quand les appelants
   * risquent de muter l'objet (sinon une mutation polluerait le cache partagé).
   */
  clone?: boolean
  /** Une fois expirée, durée pendant laquelle la valeur reste servie le temps du rafraîchissement (défaut : 5 × TTL) */
  stale?: number
}

export interface MemoGetOptions<T> {
  /** TTL spécifique à cet appel (ms) */
  ttl?: number
  /** Ne met en cache que si le prédicat est vrai (défaut : valeur non null/undefined) */
  cacheIf?: (value: T) => boolean
}

export interface MemoCache {
  get<T>(key: string, fetcher: () => Promise<T>, opts?: MemoGetOptions<T>): Promise<T>
  peek<T>(key: string): T | undefined
  set<T>(key: string, value: T, ttl?: number): void
  delete(key: string): void
  clear(): void
}

const isCacheable = (value: unknown) => value !== null && value !== undefined

export function createMemoCache({ max, ttl, clone = false, stale }: MemoCacheOptions): MemoCache {
  // Wrapper { value } : lru-cache v11 impose V extends {}
  const store = new LRUCache<string, { value: unknown; freshUntil: number }>({ max })
  const inFlight = new Map<string, Promise<unknown>>()
  const out = <T>(value: T): T => (clone && value !== null && typeof value === 'object' ? structuredClone(value) : value)
  const write = (key: string, value: unknown, entryTtl: number) =>
    store.set(key, { value, freshUntil: Date.now() + entryTtl }, { ttl: entryTtl + (stale ?? entryTtl * 5) })

  function load<T>(key: string, fetcher: () => Promise<T>, opts: MemoGetOptions<T>): Promise<T> {
    let pending = inFlight.get(key) as Promise<T> | undefined
    if (!pending) {
      pending = fetcher()
        .then((value) => {
          if ((opts.cacheIf ?? isCacheable)(value)) write(key, value, opts.ttl ?? ttl)
          return value
        })
        .finally(() => inFlight.delete(key))
      inFlight.set(key, pending)
    }
    return pending
  }

  return {
    async get<T>(key: string, fetcher: () => Promise<T>, opts: MemoGetOptions<T> = {}): Promise<T> {
      const hit = store.get(key)
      if (hit) {
        // Expirée : servie telle quelle, rafraîchie en arrière-plan (une erreur garde l'ancienne)
        if (Date.now() >= hit.freshUntil) load(key, fetcher, opts).catch(() => {})
        return out(hit.value as T)
      }
      return out(await load(key, fetcher, opts))
    },
    peek<T>(key: string) {
      const hit = store.get(key)
      return hit && Date.now() < hit.freshUntil ? out(hit.value as T) : undefined
    },
    set<T>(key: string, value: T, entryTtl?: number) {
      write(key, value, entryTtl ?? ttl)
    },
    delete(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
      inFlight.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// Cache applicatif par défaut (500 entrées, 5 min)
// ---------------------------------------------------------------------------

const cache = createMemoCache({ max: 500, ttl: 1000 * 60 * 5 })

export { cache }

/** Retourne la valeur en cache ou exécute `callback` (une seule fois si appels concurrents). */
export function remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
  // Comportement historique : toute valeur (même null) est mise en cache
  return cache.get(key, callback, { ttl, cacheIf: () => true })
}

export function forget(key: string) {
  cache.delete(key)
}
