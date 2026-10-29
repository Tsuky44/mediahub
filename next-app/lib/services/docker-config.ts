/**
 * Accès mutualisé aux réglages dont dépend la couche Docker.
 *
 * Avant, chaque opération relisait `docker_host`, `unraid_url` et
 * `unraid_api_key` en base : deux à trois requêtes SQLite par appel, avec un
 * polling toutes les 10 s côté liste et toutes les 2 s côté statistiques.
 * On garde donc les valeurs en mémoire pour une courte durée, et on invalide
 * explicitement à la sauvegarde des réglages.
 */

import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { inArray } from 'drizzle-orm'

export interface DockerConfig {
    dockerHost?: string
    unraidUrl?: string
    unraidApiKey?: string
}

const KEYS = ['docker_host', 'unraid_url', 'unraid_api_key'] as const

/**
 * TTL court : assez pour absorber une rafale de requêtes (un rendu de page
 * en déclenche plusieurs), assez court pour qu'un réglage modifié hors de
 * l'application finisse par être pris en compte sans redémarrage.
 */
const TTL_MS = 30_000

let cache: { at: number; value: DockerConfig } | null = null

export async function getDockerConfig(): Promise<DockerConfig> {
    const now = Date.now()
    if (cache && now - cache.at < TTL_MS) return cache.value

    const rows = await db
        .select({ key: settings.key, value: settings.value })
        .from(settings)
        .where(inArray(settings.key, [...KEYS]))

    const read = (key: string) => rows.find(r => r.key === key)?.value || undefined

    const value: DockerConfig = {
        dockerHost: read('docker_host') || process.env.DOCKER_HOST,
        unraidUrl: read('unraid_url') || process.env.UNRAID_URL,
        unraidApiKey: read('unraid_api_key') || process.env.UNRAID_API_KEY,
    }

    cache = { at: now, value }
    return value
}

/** À appeler dès qu'un de ces réglages est modifié. */
export function invalidateDockerConfig(): void {
    cache = null
}
