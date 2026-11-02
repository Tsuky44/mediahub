/**
 * Verification de la connexion avec un compte Onyx sur une base SQLite jetable
 * et un faux serveur Onyx (login, OTP, appairage, logout).
 *
 *   DATABASE_URL=file:./data/verify/onyx-login.db npx drizzle-kit push --force
 *   DATABASE_URL=file:./data/verify/onyx-login.db npx tsx scripts/verify-onyx-login.ts
 *
 * Appelle directement `authorize` du fournisseur NextAuth et l'authentification
 * de l'API d'integration joueur.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

const KEY = 'verify-key'
process.env.PLAYER_INTEGRATION_API_KEY = KEY
process.env.NEXTAUTH_SECRET = 'verify-secret'
process.env.NEXTAUTH_URL = 'http://mediahub.test'

type Json = Record<string, any>

// --- faux serveur Onyx -------------------------------------------------------
const accounts: Record<string, { id: number; password: string; otp?: boolean }> = {
  lea: { id: 7, password: 'pw' },
  otto: { id: 9, password: 'pw', otp: true },
  zoe: { id: 13, password: 'pw' },
  hugo: { id: 14, password: 'pw' }, // homonyme du compte MediaHub « hugo », non lie
}
const usernameById = (id: number) => Object.keys(accounts).find((n) => accounts[n].id === id) ?? 'pair'
const loggedOut: string[] = []
let devicePolls = 0
let tokenSeq = 0

const onyxUser = (id: number) => ({ id, username: usernameById(id), is_owner: false, otp_enabled: false, avatar: '' })

function startFakeOnyx() {
  return createServer((req, res) => {
    let raw = ''
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      const body: Json = raw ? JSON.parse(raw) : {}
      const send = (status: number, payload: Json) => {
        res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(payload))
      }
      if (req.url === '/api/auth/login') {
        const account = accounts[body.username]
        if (!account || account.password !== body.password) return send(401, { error: 'Invalid username or password' })
        if (account.otp) return send(401, { error: 'Code de vérification requis', otp: { challenge: 'chal-1', setup: false } })
        return send(200, { token: `tok-${++tokenSeq}`, user: onyxUser(account.id) })
      }
      if (req.url === '/api/auth/otp/login') {
        if (body.challenge === 'chal-gone') return send(410, { error: 'Étape de vérification expirée, reconnecte-toi' })
        if (body.challenge !== 'chal-1' || body.code !== '123456') return send(401, { error: 'Code incorrect' })
        return send(200, { token: `tok-${++tokenSeq}`, user: onyxUser(accounts.otto.id) })
      }
      if (req.url === '/api/auth/device/start') {
        return send(200, { device_code: 'dev-secret', user_code: 'ABCD2345', expires_in: 300, interval: 3 })
      }
      if (req.url === '/api/auth/device/poll') {
        if (body.device_code !== 'dev-secret') return send(200, { status: 'expired' })
        if (++devicePolls < 2) return send(200, { status: 'pending' })
        return send(200, { status: 'approved', token: `tok-${++tokenSeq}`, user: { id: 21, username: 'tele' } })
      }
      if (req.url === '/api/integrations/mediahub/sso/redeem') {
        if (req.headers.authorization !== `Bearer ${KEY}`) return send(401, { error: "Clé d'intégration invalide" })
        if (body.code !== 'sso-good') return send(410, { error: 'Code de connexion expiré ou déjà utilisé' })
        return send(200, { user: onyxUser(accounts.zoe.id) })
      }
      if (req.url === '/api/auth/logout') {
        loggedOut.push(String(req.headers.authorization))
        return send(200, { status: 'success' })
      }
      send(404, { error: 'not found' })
    })
  })
}

async function main() {
  const onyx = startFakeOnyx()
  await new Promise<void>((resolve) => onyx.listen(0, '127.0.0.1', resolve))
  const onyxUrl = `http://127.0.0.1:${(onyx.address() as AddressInfo).port}/`

  const { db } = await import('../lib/db/drizzle')
  const schema = await import('../lib/db/schema')
  const { eq } = await import('drizzle-orm')
  const { onyxProvider } = await import('../lib/auth/providers/onyx')
  const { linkOnyxAccount, unlinkOnyxAccount, OnyxLinkError } = await import('../lib/auth/onyx-link')
  const { authenticatePlayerIntegration } = await import('../lib/integrations/player-integration-auth')

  let clientIp = '10.0.0.1'
  const authorize = (credentials: Record<string, string>) =>
    (onyxProvider as any).options.authorize(credentials, { headers: { 'x-forwarded-for': clientIp } }) as Promise<Json | null>
  const rejects = async (credentials: Record<string, string>, pattern: RegExp) => {
    await assert.rejects(authorize(credentials), (error: Error) => pattern.test(error.message))
  }
  const setSetting = async (key: string, value: string) => {
    const now = new Date()
    await db.insert(schema.settings).values({ key, value, category: 'auth', createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: now } })
  }
  const userByOnyxId = (id: string) => db.query.users.findFirst({ where: eq(schema.users.onyxUserId, id) })

  const [member] = await db.insert(schema.roles).values({ name: 'verify-member' }).returning()
  await setSetting('default_role_id', member.id)
  const [hugo] = await db.insert(schema.users).values({ name: 'hugo', email: 'hugo@verify.local', role: 'user', roleId: member.id }).returning()
  const [mia] = await db.insert(schema.users).values({ name: 'mia', email: 'mia@verify.local', role: 'user', roleId: member.id }).returning()

  // --- desactive / non configure -------------------------------------------
  await rejects({ username: 'lea', password: 'pw' }, /désactivée/)
  await setSetting('auth_onyx_enabled', 'true')
  await rejects({ username: 'lea', password: 'pw' }, /URL Onyx non configurée/)
  await setSetting('onyx_url', onyxUrl)

  // --- mot de passe : creation automatique ---------------------------------
  const lea = await authorize({ username: 'lea', password: 'pw' })
  assert.ok(lea)
  const leaRow = await userByOnyxId('7')
  assert.equal(String(leaRow?.id), lea.id)
  assert.equal(leaRow?.name, 'lea')
  assert.equal(leaRow?.roleId, member.id)
  assert.equal(leaRow?.email, 'lea@onyx.local')
  assert.equal((await authorize({ username: 'lea', password: 'pw' }))?.id, lea.id, 'meme compte a la 2e connexion')
  assert.equal(loggedOut.length, 2, 'la session Onyx est fermee apres chaque connexion')
  assert.ok(loggedOut[0].startsWith('Bearer tok-'))

  // --- mauvais mot de passe + limitation des tentatives --------------------
  await rejects({ username: 'lea', password: 'nope' }, /Invalid username or password/)
  for (let i = 0; i < 4; i++) await rejects({ username: 'lea', password: 'nope' }, /Invalid username or password/)
  await rejects({ username: 'lea', password: 'pw' }, /Trop de tentatives/)

  clientIp = '10.0.0.2' // la limitation est par IP et identifiant
  // --- OTP -----------------------------------------------------------------
  const otpPrompt = await authorize({ username: 'otto', password: 'pw' }).catch((e: Error) => e)
  assert.ok(otpPrompt instanceof Error && otpPrompt.message === 'ONYX_OTP_REQUIRED:chal-1')
  await rejects({ challenge: 'chal-1', otp: '000000' }, /Code incorrect/)
  await rejects({ challenge: 'chal-gone', otp: '123456' }, /expirée/)
  const otto = await authorize({ challenge: 'chal-1', otp: '123456' })
  assert.equal((await userByOnyxId('9'))?.name, 'otto')
  assert.equal((await userByOnyxId('9'))?.id, Number(otto?.id))

  // --- appairage -----------------------------------------------------------
  await rejects({ deviceCode: 'dev-secret' }, /^ONYX_PAIRING_PENDING$/)
  const tele = await authorize({ deviceCode: 'dev-secret' })
  assert.equal((await userByOnyxId('21'))?.id, Number(tele?.id))
  await rejects({ deviceCode: 'wrong' }, /expiré/)

  // --- liaison d'un compte MediaHub existant -------------------------------
  // Un homonyme Onyx ne reprend pas le compte MediaHub « hugo ».
  const hugoOnyx = await authorize({ username: 'hugo', password: 'pw' })
  assert.notEqual(hugoOnyx?.id, String(hugo.id))
  assert.equal((await userByOnyxId('14'))?.email, 'hugo@onyx.local')
  assert.equal((await db.query.users.findFirst({ where: eq(schema.users.id, hugo.id) }))?.onyxUserId, null)

  await linkOnyxAccount(mia.id, { id: '13', username: 'zoe', avatar: null })
  assert.equal((await authorize({ username: 'zoe', password: 'pw' }))?.id, String(mia.id))
  await assert.rejects(linkOnyxAccount(hugo.id, { id: '13', username: 'zoe', avatar: null }), OnyxLinkError)
  await assert.rejects(linkOnyxAccount(mia.id, { id: '99', username: 'x', avatar: null }), OnyxLinkError)

  // --- creation automatique desactivee -------------------------------------
  await db.delete(schema.users).where(eq(schema.users.onyxUserId, '7'))
  await setSetting('auth_onyx_auto_create', 'false')
  await rejects({ username: 'lea', password: 'pw' }, /Aucun compte MediaHub/)
  assert.equal((await authorize({ username: 'zoe', password: 'pw' }))?.id, String(mia.id), 'un compte lie se connecte quand meme')

  // --- SSO depuis l'app Onyx -----------------------------------------------
  const sso = await import('../app/api/auth/onyx/sso/route')
  const { NextRequest } = await import('next/server')
  const { decode } = await import('next-auth/jwt')
  const ssoCall = (code: string) => sso.GET(new NextRequest(`http://mediahub.test/api/auth/onyx/sso${code ? `?code=${code}` : ''}`))
  const ssoOk = await ssoCall('sso-good')
  assert.equal(ssoOk.status, 307)
  assert.equal(new URL(ssoOk.headers.get('location')!).pathname, '/dashboard')
  const cookie = ssoOk.cookies.get('next-auth.session-token')
  assert.ok(cookie?.value, 'cookie de session pose')
  const session = await decode({ token: cookie.value, secret: 'verify-secret' })
  assert.equal(session?.sub, String(mia.id), 'session du compte lie a l id Onyx')
  const ssoBad = await ssoCall('sso-used')
  assert.equal(new URL(ssoBad.headers.get('location')!).pathname, '/login')
  assert.match(new URL(ssoBad.headers.get('location')!).searchParams.get('error')!, /expiré/)
  assert.equal(ssoBad.cookies.get('next-auth.session-token'), undefined)
  assert.match(new URL((await ssoCall('')).headers.get('location')!).searchParams.get('error')!, /invalide/)

  // --- integration joueur : X-Player-Id ------------------------------------
  const call = (headers: Record<string, string>) =>
    authenticatePlayerIntegration(new Request('http://mediahub.test/', { headers: { authorization: `Bearer ${KEY}`, ...headers } }))
  const byId = await call({ 'x-player-id': '13', 'x-player-username': 'renomme' })
  assert.equal(byId?.id, String(mia.id), 'retrouve par id Onyx malgre un nom different')
  assert.equal(byId?.name, 'renomme')
  const byName = await call({ 'x-player-username': 'hugo' })
  assert.equal(byName?.id, String(hugo.id), 'repli sur le nom sans id')
  const unknownId = await call({ 'x-player-id': '999', 'x-player-username': 'hugo' })
  assert.equal(unknownId?.id, String(hugo.id), 'id inconnu : repli sur le nom')
  const otherAccount = await call({ 'x-player-id': '999', 'x-player-username': 'mia' })
  assert.equal(otherAccount?.id, '0', 'un nom lie a un autre compte Onyx n est pas reconnu')
  assert.equal((await call({ 'x-player-id': '13' }))?.id, String(mia.id), 'id seul')
  assert.equal(await authenticatePlayerIntegration(new Request('http://mediahub.test/', { headers: { 'x-player-id': '13' } })), null)

  await unlinkOnyxAccount(mia.id)
  assert.equal((await call({ 'x-player-id': '13' }))?.id, '0')

  onyx.close()
  console.log('Connexion Onyx : toutes les verifications passent')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
