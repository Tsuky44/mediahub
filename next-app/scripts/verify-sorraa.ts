/**
 * Verification du choix du gestionnaire de telechargement (sorraa) sur une base SQLite jetable.
 *
 *   DATABASE_URL=file:./data/verify/sorraa.db npx drizzle-kit push --force
 *   DATABASE_URL=file:./data/verify/sorraa.db npx tsx scripts/verify-sorraa.ts
 *
 * sorraa est simule par un petit serveur HTTP local ; le webhook est appele
 * directement avec des livraisons signees comme le fait sorraa.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

// revalidatePath exige un contexte Next : neutralise hors serveur
const nodeModule = require('node:module') as { _load: (request: string, ...rest: unknown[]) => unknown }
const originalLoad = nodeModule._load
nodeModule._load = function (request: string, ...rest: unknown[]) {
  if (request === 'next/cache') return { revalidatePath() {}, revalidateTag() {} }
  return originalLoad.call(this, request, ...rest)
}

type Json = Record<string, any>
const API_KEY = 'srr_verify'
const PLAYER_KEY = 'player-verify'
process.env.PLAYER_INTEGRATION_API_KEY = PLAYER_KEY
const SECRET = 'verify-secret'

// --- faux sorraa -----------------------------------------------------------
const posted: Json[] = []
const batches: number[] = []
const seen: Array<{ method: string; url: string; auth?: string }> = []
let nextId = 1
const requests: Json[] = []
let availabilitySupported = false
let libraryProgress: number | undefined

/** /availability du faux sorraa, calcule depuis les demandes. */
function availabilityOf(kind: string, tmdbId: number): Json {
  const found = requests.filter((r) => r.kind === kind && r.tmdbId === tmdbId)
  if (found.length === 0) return { inLibrary: false, state: 'absent' }
  const r = found[0]
  return {
    inLibrary: true, state: r.state, mediaId: r.mediaId, title: `Titre ${tmdbId}`, monitored: true,
    seasons: kind === 'movie'
      ? [{ number: 0, state: r.state, episodesHeld: 0, episodesReleased: 1, episodesTotal: 1, monitored: true }]
      : (r.seasons ?? []).map((s: Json) => ({ ...s, episodesHeld: 0, episodesReleased: 5, episodesTotal: 5, monitored: true })),
    ...(libraryProgress !== undefined ? { progress: libraryProgress, etaSeconds: 3700 } : {}),
  }
}

function startFakeSorraa() {
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      const url = new URL(req.url ?? '/', 'http://x')
      seen.push({ method: req.method ?? '', url: url.pathname + url.search, auth: req.headers.authorization })
      const send = (status: number, data?: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(data === undefined ? undefined : JSON.stringify(data))
      }
      if (url.pathname === '/api/v1/health') return send(200, { status: 'ok', version: '0.1.0' })
      if (req.headers.authorization !== `Bearer ${API_KEY}`) return send(401, { title: 'Unauthorized', code: 'unauthorized' })
      if (url.pathname === '/api/v1/system') return send(200, { version: '0.1.0', apiVersion: 1 })
      if (url.pathname === '/api/v1/requests' && req.method === 'POST') {
        const draft = JSON.parse(body)
        posted.push(draft)
        const request = {
          id: nextId++, mediaId: 10 + nextId, kind: draft.kind, tmdbId: draft.tmdbId, requester: draft.requester,
          createdAt: new Date().toISOString(), state: 'pending',
          ...(draft.kind === 'series' ? { seasons: (draft.seasons ?? [1, 2, 3]).map((n: number) => ({ number: n, state: 'pending' })) } : {}),
        }
        requests.push(request)
        return send(201, request)
      }
      if (url.pathname === '/api/v1/requests' && req.method === 'GET') {
        const tmdb = Number(url.searchParams.get('tmdbId'))
        const kind = url.searchParams.get('kind')
        return send(200, { items: requests.filter((r) => r.tmdbId === tmdb && r.kind === kind) })
      }
      if (availabilitySupported && url.pathname === '/api/v1/availability') {
        return send(200, availabilityOf(url.searchParams.get('kind')!, Number(url.searchParams.get('tmdbId'))))
      }
      if (availabilitySupported && url.pathname === '/api/v1/availability-queries') {
        const items = JSON.parse(body).items as Array<{ kind: string; tmdbId: number }>
        batches.push(items.length)
        return send(200, { items: items.map((it) => availabilityOf(it.kind, it.tmdbId)) })
      }
      if (url.pathname === '/api/v1/grabs') {
        return send(200, { items: libraryProgress === undefined ? [] : [{ id: 1, mediaId: 12, releaseName: 'Matrix.1999.1080p', status: 'downloading', progress: libraryProgress, sizeLeft: 2147483648, speed: 1048576 }] })
      }
      if (url.pathname === '/api/v1/media/12') return send(200, { id: 11, versions: [{ id: 1, rootFolderId: 2 }] })
      if (url.pathname === '/api/v1/root-folders') return send(200, { items: [{ id: 1, path: '/autre', defaultFor: [] }, { id: 2, path: '/data/films/', defaultFor: ['movie'] }] })
      send(404, { title: 'Not found' })
    })
  })
  return new Promise<{ server: typeof server; url: string }>((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }))
  )
}

async function main() {
  const fake = await startFakeSorraa()

  const { db } = await import('../lib/db/drizzle')
  const schema = await import('../lib/db/schema')
  const { setSetting } = await import('../lib/settings')
  const { eq } = await import('drizzle-orm')
  const { createMediaRequest } = await import('../lib/services/media-requests')
  const { getMediaAvailability } = await import('../lib/services/media-status')
  const { getManagerKind } = await import('../lib/download-managers')
  const { SorraaService, SorraaError } = await import('../lib/services/sorraa')
  const { signSorraaDelivery } = await import('../lib/webhooks/verify-sorraa')
  const webhook = await import('../app/api/webhooks/sorraa/route')
  const { checkDownloadStatus } = await import('../app/dashboard/media/[id]/download-status-actions')
  const { serializeRequest } = await import('../lib/integrations/player-v1')

  const [admin] = await db.insert(schema.users).values({ name: 'root', email: 'root@verify.local', role: 'admin' }).returning()
  const user = { id: String(admin.id), name: 'root', email: 'root@verify.local', role: 'admin' }

  // --- par defaut : Radarr/Sonarr, comportement inchange -------------------
  assert.equal(await getManagerKind('movie'), 'arr')
  assert.equal(await getManagerKind('tv'), 'arr')
  assert.equal((await createMediaRequest(user, { tmdbId: 603, mediaType: 'movie', title: 'Matrix' })).status, 503)
  assert.equal(posted.length, 0, 'sorraa ne doit pas etre appele tant qu\'il n\'est pas choisi')

  // --- test de connexion ---------------------------------------------------
  assert.deepEqual(await new SorraaService(fake.url, API_KEY).testConnection(), { version: '0.1.0' })
  await assert.rejects(new SorraaService(fake.url, 'mauvaise').testConnection(), (e: any) => e instanceof SorraaError && e.status === 401)
  await assert.rejects(new SorraaService('http://127.0.0.1:1', API_KEY).testConnection(), (e: any) => e instanceof SorraaError && e.status === 503)

  // --- sorraa pour tout -----------------------------------------------------
  await setSetting('sorraa_url', fake.url)
  await setSetting('sorraa_api_key', API_KEY)
  await setSetting('download_manager_movie', 'sorraa')
  await setSetting('download_manager_tv', 'sorraa')
  assert.equal(await getManagerKind('movie'), 'sorraa')

  const movie = await createMediaRequest(user, { tmdbId: 603, mediaType: 'movie', title: 'Matrix' })
  assert.equal(movie.status, 200)
  assert.equal(movie.requestIds.length, 1)
  assert.deepEqual(posted[0], { kind: 'movie', tmdbId: 603, requester: { name: 'root', ref: String(admin.id) } })
  assert.equal(seen.find((s) => s.method === 'POST')?.auth, `Bearer ${API_KEY}`)
  const movieRow = await db.query.mediaRequests.findFirst({ where: eq(schema.mediaRequests.id, movie.requestIds[0]) })
  assert.equal(movieRow?.status, 2)
  assert.equal(movieRow?.externalId, 'sorraa:1')

  const tv = await createMediaRequest(user, { tmdbId: 1399, mediaType: 'tv', title: 'GoT', seasons: [1, 2] })
  assert.equal(tv.status, 200)
  assert.equal(tv.requestIds.length, 2, 'une ligne locale par saison')
  assert.deepEqual(posted[1].seasons, [1, 2])
  const tvAll = await createMediaRequest(user, { tmdbId: 66732, mediaType: 'tv', title: 'ST' })
  assert.equal(tvAll.requestIds.length, 3, 'toutes les saisons rendues par sorraa')
  assert.equal('seasons' in posted[2], false)

  // --- statut remonte depuis sorraa ------------------------------------------
  assert.equal((await getMediaAvailability(603, 'movie', true)).status, 'pending')
  requests[0].state = 'processing'
  assert.equal((await getMediaAvailability(603, 'movie', true)).status, 'processing')
  assert.equal((await getMediaAvailability(999, 'movie', true)).status, 'unknown')
  requests[1].seasons = [{ number: 1, state: 'available' }, { number: 2, state: 'pending' }]
  requests[1].state = 'partial'
  const tvAvail = await getMediaAvailability(1399, 'tv', true)
  assert.equal(tvAvail.status, 'partial')
  assert.deepEqual(tvAvail.seasons?.map((s) => [s.seasonNumber, s.status]), [[1, 'available'], [2, 'pending']])

  // --- /availability (sorraa recent) : progression, attente, sortie, lot -------------
  availabilitySupported = true
  libraryProgress = 0.425
  const withProgress = await getMediaAvailability(603, 'movie', true)
  assert.equal(withProgress.status, 'processing')
  assert.equal(withProgress.progress, 0.425)
  const dl = await checkDownloadStatus(603, 'movie', undefined, 'Matrix')
  assert.equal(dl?.isDownloading, true)
  assert.equal(dl?.progress, 42.5)
  assert.equal(dl?.timeleft, '1h 1m')
  assert.equal(dl?.releaseTitle, 'Matrix.1999.1080p')
  assert.equal(dl?.speed, '1 MB/s')
  const serialized = serializeRequest(movieRow!, { availability: withProgress })
  assert.equal(serialized.progress, 42.5)
  libraryProgress = undefined
  assert.equal(await checkDownloadStatus(603, 'movie', undefined, 'Matrix'), null)
  assert.equal(serializeRequest(movieRow!, { availability: await getMediaAvailability(603, 'movie', true) }).progress, null)
  // media present dans sorraa sans demande MediaHub : hors liste de demandes, il reste visible
  requests.push({ id: 99, mediaId: 50, kind: 'movie', tmdbId: 7, requester: { name: 'x' }, createdAt: '', state: 'available' })
  assert.equal((await getMediaAvailability(7, 'movie', true)).status, 'available')
  assert.equal((await getMediaAvailability(8, 'movie', true)).status, 'unknown')
  const batch = await (await import('../app/api/integrations/player/v1/availability/route')).POST(
    new Request('http://mediahub.test/', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + PLAYER_KEY }, body: JSON.stringify({ items: [{ tmdbId: 7, mediaType: 'movie' }, { tmdbId: 1399, mediaType: 'tv' }, { tmdbId: 8, mediaType: 'movie' }] }) })
  )
  assert.equal(batch.status, 200)
  assert.deepEqual((await batch.json()).results.map((r: Json) => r.status), ['available', 'partial', 'unknown'])
  assert.deepEqual(batches, [2, 1], 'un appel par type de media, pas un par titre')

  // --- Radarr pour les series, sorraa pour les films ---------------------------
  await setSetting('download_manager_tv', 'arr')
  const before = posted.length
  assert.equal((await createMediaRequest(user, { tmdbId: 1396, mediaType: 'tv', title: 'BB' })).status, 503) // Sonarr non configure ici
  assert.equal(posted.length, before)
  assert.equal((await createMediaRequest(user, { tmdbId: 550, mediaType: 'movie', title: 'Fight Club' })).status, 200)
  assert.equal(posted.length, before + 1)
  await setSetting('download_manager_tv', 'sorraa')

  // --- webhook : signature ------------------------------------------------------
  const deliver = async (payload: Json, opts: { secret?: string; ageSeconds?: number } = {}) => {
    const body = JSON.stringify(payload)
    const ts = String(Math.floor(Date.now() / 1000) - (opts.ageSeconds ?? 0))
    const headers = new Headers({
      'content-type': 'application/json',
      'x-sorraa-event': payload.event,
      'x-sorraa-timestamp': ts,
      'x-sorraa-signature': signSorraaDelivery(opts.secret ?? SECRET, ts, body),
    })
    return webhook.POST(new Request('http://mediahub.test/api/webhooks/sorraa', { method: 'POST', headers, body }) as any)
  }
  const matrix = { id: 10, kind: 'movie', tmdbId: 603, title: 'Matrix' }
  const imported = { id: 3, event: 'imported', at: new Date().toISOString(), media: matrix, path: '/films/Matrix.mkv', requests: [{ id: 1, state: 'available' }] }

  assert.equal((await deliver(imported)).status, 401, 'sans secret configure, refus')
  await setSetting('webhook_sorraa_secret', SECRET)
  assert.equal((await deliver(imported, { secret: 'autre' })).status, 401)
  assert.equal((await deliver(imported, { ageSeconds: 3600 })).status, 401)
  assert.equal((await deliver({ id: 0, event: 'test', at: new Date().toISOString() })).status, 200)

  // --- webhook : statuts et evenements --------------------------------------------
  const status = async (id: number) => (await db.query.mediaRequests.findFirst({ where: eq(schema.mediaRequests.id, id) }))?.status
  assert.equal((await deliver({ ...imported, id: 2, event: 'grabbed', quality: 'Bluray-1080p', release: 'Matrix.1999', requests: [{ id: 1, state: 'processing' }] })).status, 200)
  assert.equal(await status(movie.requestIds[0]), 3)
  assert.equal((await deliver(imported)).status, 200)
  assert.equal(await status(movie.requestIds[0]), 5)
  // chemin pour Onyx : reconstruit avec le dossier racine de la version quand sorraa n'envoie que le relatif
  const rooted = await new SorraaService(fake.url, API_KEY).resolveAbsolutePath(12, 'Matrix/Matrix.mkv')
  assert.equal(rooted, '/data/films/Matrix/Matrix.mkv')
  assert.equal(await new SorraaService(fake.url, API_KEY).resolveAbsolutePath(12, '/deja/absolu.mkv'), '/deja/absolu.mkv')
  // un evenement en retard ne fait pas reculer, request_changed oui
  assert.equal((await deliver({ ...imported, id: 4, event: 'grabbed', requests: [{ id: 1, state: 'processing' }] })).status, 200)
  assert.equal(await status(movie.requestIds[0]), 5)
  assert.equal((await deliver({ ...imported, id: 5, event: 'request_changed', requests: [{ id: 1, state: 'pending' }] })).status, 200)
  assert.equal(await status(movie.requestIds[0]), 2)

  // serie : etat par saison
  const got = { id: 11, kind: 'series', tmdbId: 1399, title: 'GoT' }
  assert.equal((await deliver({
    id: 6, event: 'imported', at: new Date().toISOString(), media: got, unit: { id: 5, kind: 'episode', season: 1, episode: 3 },
    requests: [{ id: 2, state: 'partial', seasons: [{ number: 1, state: 'available' }, { number: 2, state: 'processing' }] }],
  })).status, 200)
  assert.deepEqual(await Promise.all(tv.requestIds.map(status)), [5, 3])

  assert.equal((await deliver({ id: 7, event: 'download_failed', at: new Date().toISOString(), media: got, unit: { id: 5, kind: 'episode', season: 2 }, message: 'Torrent mort' })).status, 200)
  assert.equal((await deliver({ id: 8, event: 'health_degraded', at: new Date().toISOString(), message: 'indexeur' })).status, 200)

  fake.server.close()
  console.log('verify-sorraa : tout est vert')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
