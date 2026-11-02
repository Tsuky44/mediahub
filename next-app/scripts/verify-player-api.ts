/**
 * Verification de l'API d'integration v1 (Onyx) sur une base SQLite jetable.
 *
 *   DATABASE_URL=file:./data/verify/test.db npx drizzle-kit push --force
 *   DATABASE_URL=file:./data/verify/test.db npx tsx scripts/verify-player-api.ts
 *
 * Appelle directement les handlers de route avec des objets Request et recoit
 * les webhooks sortants sur un petit serveur HTTP local.
 */
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

const KEY = 'verify-key'
process.env.PLAYER_INTEGRATION_API_KEY = KEY

type Json = Record<string, any>
const received: Array<{ headers: Record<string, string | string[] | undefined>; body: string }> = []

async function main() {
  const sink = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      received.push({ headers: req.headers, body })
      res.writeHead(204).end()
    })
  })
  await new Promise<void>((resolve) => sink.listen(0, '127.0.0.1', resolve))
  process.env.ONYX_WEBHOOK_URL = `http://127.0.0.1:${(sink.address() as AddressInfo).port}/events`

  const { db } = await import('../lib/db/drizzle')
  const schema = await import('../lib/db/schema')
  const ping = await import('../app/api/integrations/player/v1/ping/route')
  const list = await import('../app/api/integrations/player/v1/requests/route')
  const feed = await import('../app/api/integrations/player/v1/requests/feed/route')
  const one = await import('../app/api/integrations/player/v1/requests/[id]/route')
  const avail = await import('../app/api/integrations/player/v1/availability/route')
  const hook = await import('../app/api/integrations/player/v1/webhook/test/route')

  // --- donnees ---------------------------------------------------------
  const [member] = await db.insert(schema.roles).values({ name: 'verify-member' }).returning()
  await db.insert(schema.permissions).values([
    { action: 'read', subject: 'Media', roleId: member.id },
    { action: 'create', subject: 'MediaRequest', roleId: member.id },
  ])
  const [admin] = await db.insert(schema.users).values({ name: 'root', email: 'root@verify.local', role: 'admin' }).returning()
  const [lea] = await db.insert(schema.users).values({ name: 'lea', email: 'lea@verify.local', role: 'user', roleId: member.id }).returning()
  const [hugo] = await db.insert(schema.users).values({ name: 'hugo', email: 'hugo@verify.local', role: 'user', roleId: member.id }).returning()
  const rows = await db.insert(schema.mediaRequests).values([
    { userId: lea.id, mediaType: 'movie', tmdbId: '603', title: 'Matrix', status: 2, requesterName: 'lea', metadata: JSON.stringify({ posterPath: '/matrix.jpg' }) },
    { userId: hugo.id, mediaType: 'tv', tmdbId: '1399', title: 'Game of Thrones', status: 3, requesterName: 'hugo', metadata: JSON.stringify({ posterPath: null, seasons: [2] }) },
  ]).returning()

  const call = (path: string, user: string | null, init: RequestInit = {}, key: string | null = KEY) => {
    const headers = new Headers(init.headers)
    if (key) headers.set('authorization', `Bearer ${key}`)
    if (user) headers.set('x-player-username', user)
    if (init.body) headers.set('content-type', 'application/json')
    return new Request(`http://mediahub.test${path}`, { ...init, headers })
  }
  const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) })
  const json = async (res: Response) => (await res.json()) as Json
  const waitForEvents = async (count: number) => {
    for (let i = 0; i < 40 && received.length < count; i++) await new Promise((r) => setTimeout(r, 50))
  }

  // --- auth + ping -----------------------------------------------------
  assert.equal((await ping.GET(call('/', 'lea', {}, null))).status, 401)
  assert.equal((await ping.GET(call('/', 'lea', {}, 'wrong'))).status, 401)
  const pong = await json(await ping.GET(call('/', 'lea')))
  assert.equal(pong.status, 'ok')
  assert.equal(pong.apiVersion, 1)
  assert.equal(pong.user.linked, true)
  assert.equal(pong.user.can.request, true)
  assert.equal(pong.user.can.moderate, false)
  assert.equal(pong.webhookConfigured, true)
  const adminPong = await json(await ping.GET(call('/', 'root')))
  assert.equal(adminPong.user.can.moderate, true)

  // --- lecture : portee et permissions ----------------------------------
  const mine = await json(await list.GET(call('/?scope=mine', 'lea')))
  assert.deepEqual(mine.requests.map((r: Json) => r.title), ['Matrix'])
  assert.equal(mine.requests[0].status, 'approved')
  assert.equal(mine.requests[0].posterPath, '/matrix.jpg')
  // lea n'a pas 'read MediaRequest' : portee all refusee, flux refuse
  assert.equal((await list.GET(call('/?scope=all', 'lea'))).status, 403)
  assert.equal((await feed.GET(call('/', 'lea'))).status, 403)
  const all = await json(await list.GET(call('/?scope=all', 'root')))
  assert.equal(all.requests.length, 2)
  assert.equal(all.requests[0].requester, 'hugo')
  const stream = await json(await feed.GET(call('/?after=0', 'root')))
  assert.equal(stream.requests.length, 2)
  assert.equal(stream.cursor, rows[1].id)
  assert.equal((await json(await feed.GET(call(`/?after=${stream.cursor}`, 'root')))).requests.length, 0)
  assert.equal((await feed.GET(call('/?after=abc', 'root'))).status, 400)
  // compte inconnu de MediaHub : liste vide, pas d'erreur
  assert.deepEqual((await json(await list.GET(call('/', 'inconnu')))).requests, [])

  // --- detail -----------------------------------------------------------
  const detail = await json(await one.GET(call(`/${rows[0].id}`, 'lea'), ctx(rows[0].id)))
  assert.equal(detail.title, 'Matrix')
  assert.equal((await one.GET(call('/999', 'root'), ctx(999))).status, 404)

  // --- creation : refus de permission et erreur de validation ------------
  assert.equal((await list.POST(call('/', 'inconnu', { method: 'POST', body: '{}' }))).status, 400)
  assert.equal((await list.POST(call('/', 'root', { method: 'POST', body: JSON.stringify({ tmdbId: 603, mediaType: 'movie' }) }))).status, 503) // Radarr non configure ici

  // --- moderation ---------------------------------------------------------
  const patch = (id: number, user: string, body: unknown) =>
    one.PATCH(call(`/${id}`, user, { method: 'PATCH', body: JSON.stringify(body) }), ctx(id))
  assert.equal((await patch(rows[0].id, 'lea', { action: 'decline' })).status, 403)
  assert.equal((await patch(rows[0].id, 'root', { action: 'nope' })).status, 400)
  const declined = await json(await patch(rows[0].id, 'root', { action: 'decline', reason: 'Doublon' }))
  assert.equal(declined.status, 'declined')
  assert.equal(declined.note, 'Doublon')

  // --- suppression --------------------------------------------------------
  assert.equal((await one.DELETE(call(`/${rows[1].id}`, 'lea', { method: 'DELETE' }), ctx(rows[1].id))).status, 403)
  assert.equal((await one.DELETE(call(`/${rows[1].id}`, 'root', { method: 'DELETE' }), ctx(rows[1].id))).status, 200)

  // --- disponibilite : validation ------------------------------------------
  assert.equal((await avail.POST(call('/', 'lea', { method: 'POST', body: JSON.stringify({ items: 'x' }) }))).status, 400)

  // --- webhook sortant ------------------------------------------------------
  assert.equal((await hook.POST(call('/', 'lea', { method: 'POST' }))).status, 403)
  assert.equal((await hook.POST(call('/', 'root', { method: 'POST' }))).status, 200)
  await waitForEvents(3)
  const events = received.map((r) => JSON.parse(r.body) as Json)
  assert.deepEqual(events.map((e) => e.event).sort(), ['request.deleted', 'request.status_changed', 'webhook.test'])
  for (const delivery of received) {
    assert.equal(delivery.headers.authorization, `Bearer ${KEY}`)
    const expected = 'sha256=' + createHmac('sha256', KEY).update(delivery.body).digest('hex')
    assert.equal(delivery.headers['x-mediahub-signature'], expected)
    assert.equal(JSON.parse(delivery.body).apiVersion, 1)
  }
  const changed = events.find((e) => e.event === 'request.status_changed')!
  assert.equal(changed.data.request.status, 'declined')
  assert.equal(changed.data.previousStatus, 'approved')
  assert.equal(changed.data.request.requester, 'lea')

  sink.close()
  console.log('API joueur v1 : toutes les verifications passent')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
