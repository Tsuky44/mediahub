import { LRUCache } from 'lru-cache'
import { logAction } from '@/lib/audit'

// Stocke les tentatives échouées de connexion
const limiter = new LRUCache<string, { count: number; blockedUntil: number }>({
  max: 2000,
  ttl: 1000 * 60 * 15, // TTL de 15 minutes
})

/**
 * Vérifie si une tentative de connexion pour un couple IP/Utilisateur/Provider est autorisée.
 * Retourne { allowed: true } ou { allowed: false, timeLeft: minutes_restantes }.
 */
export async function checkRateLimit(
  ip: string,
  username: string,
  providerId: string
): Promise<{ allowed: boolean; timeLeft?: number }> {
  const limitKey = `login:${providerId}:${ip}:${username}`
  const attempt = limiter.get(limitKey)

  if (attempt && attempt.blockedUntil > Date.now()) {
    const timeLeft = Math.ceil((attempt.blockedUntil - Date.now()) / 1000 / 60)
    return { allowed: false, timeLeft }
  }

  return { allowed: true }
}

/**
 * Enregistre un échec de connexion. Si le nombre de tentatives atteint 5,
 * l'adresse IP et le compte sont bloqués pendant 15 minutes.
 */
export async function registerLoginFailure(
  ip: string,
  username: string,
  providerId: string
) {
  const limitKey = `login:${providerId}:${ip}:${username}`
  const attempt = limiter.get(limitKey)
  const currentAttempts = (attempt?.count || 0) + 1

  if (currentAttempts >= 5) {
    limiter.set(limitKey, {
      count: currentAttempts,
      blockedUntil: Date.now() + 1000 * 60 * 15 // Bloquer pendant 15 minutes
    })
    try {
      await logAction(
        0,
        'SECURITY_ALERT',
        'User',
        username,
        { message: `IP/Compte temporairement bloqué suite à 5 échecs de connexion sur le provider ${providerId}`, ip, provider: providerId }
      )
    } catch (e) {
      console.error('[RateLimiter] Failed to log security alert:', e)
    }
  } else {
    limiter.set(limitKey, {
      count: currentAttempts,
      blockedUntil: 0
    })
  }
}

/**
 * Supprime l'historique de tentatives pour un couple IP/Utilisateur/Provider (appelé lors d'un succès).
 */
export async function clearRateLimit(
  ip: string,
  username: string,
  providerId: string
) {
  const limitKey = `login:${providerId}:${ip}:${username}`
  limiter.delete(limitKey)
}
