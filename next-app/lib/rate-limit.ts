// Patch 16: Rate limiting in-memory (sliding window)
// Protège les routes API sensibles contre les floods accidentels ou malveillants.
// Pas de dépendance externe — simple Map en mémoire par process Next.js.

interface RateLimitConfig {
  windowMs: number  // Taille de la fenêtre en ms
  max: number       // Nombre max de requêtes dans cette fenêtre
}

// Stockage des timestamps par clé (IP + route)
const store = new Map<string, number[]>()

// Nettoyage périodique pour éviter les fuites mémoire (10 min d'historique max)
setInterval(() => {
  const cutoff = Date.now() - 600_000
  for (const [key, timestamps] of store.entries()) {
    const valid = timestamps.filter(t => t > cutoff)
    if (valid.length === 0) store.delete(key)
    else store.set(key, valid)
  }
}, 60_000)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetMs: number
}

/**
 * Vérifie si la requête est autorisée selon la config.
 * @param key  Clé unique (ex: `${ip}:${route}`)
 * @param config Fenêtre + max requêtes
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowStart = now - config.windowMs

  const timestamps = (store.get(key) ?? []).filter(t => t > windowStart)

  if (timestamps.length >= config.max) {
    const resetMs = Math.max(0, timestamps[0] + config.windowMs - now)
    return { allowed: false, remaining: 0, resetMs }
  }

  timestamps.push(now)
  store.set(key, timestamps)

  return {
    allowed: true,
    remaining: config.max - timestamps.length,
    resetMs: 0
  }
}

/**
 * Extrait l'IP cliente depuis les headers Next.js (supporte proxies).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
