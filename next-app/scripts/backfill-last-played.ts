/**
 * Backfill de la table `media_last_played` à partir d'Emby.
 *
 * Emby ne renvoie `UserData.LastPlayedDate` que lors de la lecture d'un item
 * UNIQUE (les requêtes de liste renvoient un UserData allégé). Le plugin
 * Playback Reporting, lui, n'a qu'une rétention de quelques mois. Pour obtenir
 * une date de dernière lecture FIABLE et HISTORIQUE par média, on parcourt donc
 * une fois les items ayant une activité (lecture terminée ou en cours) pour
 * chaque utilisateur, puis on lit la date réelle item par item.
 *
 * Résultat stocké par itemId (film ou épisode) = date la plus récente tous
 * utilisateurs confondus. La colonne "Regardé" agrège ensuite les épisodes par
 * série via le mapping episodeId -> seriesId.
 *
 * Usage :  npx tsx scripts/backfill-last-played.ts
 */
import { db, sqlite } from '../lib/db/drizzle'
import { settings, mediaLastPlayed } from '../lib/db/schema'
import { eq } from 'drizzle-orm'
import { EmbyService } from '../lib/services/emby'

const CONCURRENCY = 12

async function getSetting(key: string): Promise<string | null> {
    const envKey = key.toUpperCase()
    if (process.env[envKey]) return process.env[envKey]!
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) })
    return row?.value ?? null
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let cursor = 0
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
            const i = cursor++
            results[i] = await fn(items[i], i)
        }
    })
    await Promise.all(workers)
    return results
}

async function main() {
    const embyUrl = await getSetting('emby_url')
    const embyApiKey = await getSetting('emby_api_key')
    if (!embyUrl || !embyApiKey) {
        console.error('[backfill] Emby non configuré (emby_url / emby_api_key manquants).')
        process.exit(1)
    }

    const emby = new EmbyService(embyUrl, embyApiKey)
    const client = await emby.getClient(30000)

    const users = await emby.getUsers()
    console.log(`[backfill] ${users.length} utilisateurs.`)

    // 1. Collecte des paires (userId, itemId) ayant une activité (rapide).
    const pairs: Array<{ userId: string; itemId: string; itemType: string }> = []
    const seen = new Set<string>()
    for (const user of users) {
        const userId = String(user.Id)
        for (const filter of ['IsPlayed', 'IsResumable']) {
            try {
                const res = await client.get(`/Users/${userId}/Items`, {
                    params: {
                        Recursive: true,
                        IncludeItemTypes: 'Movie,Episode',
                        Filters: filter,
                        Fields: 'BasicSyncInfo',
                    },
                })
                for (const it of (res.data.Items || [])) {
                    const key = `${userId}:${it.Id}`
                    if (seen.has(key)) continue
                    seen.add(key)
                    pairs.push({ userId, itemId: String(it.Id), itemType: String(it.Type) })
                }
            } catch (e) {
                console.warn(`[backfill] liste ${filter} échouée pour ${user.Name}:`, (e as Error).message)
            }
        }
    }
    console.log(`[backfill] ${pairs.length} paires (utilisateur, média) à lire.`)

    // 2. Lecture unitaire de LastPlayedDate + agrégation MAX par itemId.
    const maxByItem = new Map<string, { at: number; type: string }>()
    let done = 0
    await mapLimit(pairs, CONCURRENCY, async (p) => {
        try {
            const res = await client.get(`/Users/${p.userId}/Items/${p.itemId}`, {
                params: { Fields: 'UserData' },
            })
            const lpd = res.data?.UserData?.LastPlayedDate
            if (lpd) {
                const t = new Date(lpd).getTime()
                if (!isNaN(t)) {
                    const cur = maxByItem.get(p.itemId)
                    if (!cur || t > cur.at) maxByItem.set(p.itemId, { at: t, type: p.itemType })
                }
            }
        } catch {
            // item indisponible pour cet utilisateur : ignoré
        } finally {
            done++
            if (done % 250 === 0) console.log(`[backfill] ${done}/${pairs.length} lus...`)
        }
    })

    console.log(`[backfill] ${maxByItem.size} items avec une date. Écriture en base...`)

    // 3. Upsert dans media_last_played (transaction, par lots).
    const now = new Date()
    const entries = Array.from(maxByItem.entries())
    const upsert = sqlite.prepare(
        `INSERT INTO media_last_played (item_id, item_type, last_played_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(item_id) DO UPDATE SET
           item_type = excluded.item_type,
           last_played_at = excluded.last_played_at,
           updated_at = excluded.updated_at`
    )
    const tx = sqlite.transaction((rows: typeof entries) => {
        for (const [itemId, v] of rows) {
            upsert.run(itemId, v.type, v.at, now.getTime())
        }
    })
    tx(entries)

    console.log(`[backfill] Terminé : ${maxByItem.size} médias mis à jour dans media_last_played.`)
    process.exit(0)
}

main().catch((e) => {
    console.error('[backfill] Erreur fatale:', e)
    process.exit(1)
})
