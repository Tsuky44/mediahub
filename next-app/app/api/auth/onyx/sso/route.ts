import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { authOptions } from '@/lib/auth'
import { getOnyxAuthConfig, OnyxLinkError, resolveOnyxUser } from '@/lib/auth/onyx-link'
import { checkRateLimit, registerLoginFailure } from '@/lib/auth/rate-limiter'
import { OnyxAuthError, onyxSsoRedeem } from '@/lib/services/onyx-auth'

export const dynamic = 'force-dynamic'

const MAX_AGE = 30 * 24 * 60 * 60

function publicOrigin(request: NextRequest) {
  if (process.env.NEXTAUTH_URL) return new URL(process.env.NEXTAUTH_URL).origin
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '')
  return `${proto}://${host}`
}

/**
 * Ouvre MediaHub deja connecte depuis l'app Onyx : l'app envoie le navigateur
 * ici avec un code a usage unique, que MediaHub rachete aupres d'Onyx avec la
 * cle d'integration. Contrat : docs/player-integration/v1/onyx-login-contract.md
 */
export async function GET(request: NextRequest) {
  const origin = publicOrigin(request)
  const fail = (message: string) => {
    const url = new URL('/login', origin)
    url.searchParams.set('error', message)
    const res = NextResponse.redirect(url)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  const code = request.nextUrl.searchParams.get('code')?.trim()
  if (!code) return fail('Lien de connexion Onyx invalide')

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1'
  const rate = await checkRateLimit(ip, 'sso', 'onyx')
  if (!rate.allowed) return fail(`Trop de tentatives de connexion via Onyx. Réessayez dans ${rate.timeLeft} minute(s).`)

  const config = await getOnyxAuthConfig()
  const apiKey = process.env.PLAYER_INTEGRATION_API_KEY?.trim()
  if (!config.enabled || !config.url) return fail("L'authentification via Onyx est désactivée")
  if (!apiKey) return fail("Clé d'intégration Onyx non configurée")

  try {
    const account = await onyxSsoRedeem(config.url, apiKey, code)
    const user = await resolveOnyxUser(account, config)

    const token = await encode({
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: MAX_AGE,
      token: {
        sub: String(user.id),
        name: user.name,
        email: user.email,
        picture: user.image ?? null,
        role: user.roleRef?.name || user.role || 'user',
        embyUserId: user.embyUserId ?? null,
        plexUserId: user.plexUserId ?? null,
        jellyfinUserId: user.jellyfinUserId ?? null,
        discordUserId: user.discordUserId ?? null,
        whatsappNumber: user.whatsappNumber ?? null,
      },
    })

    try {
      const { logAction } = await import('@/lib/audit')
      await logAction(user.id, 'USER_LOGIN', 'User', String(user.id), { provider: 'onyx-sso' })
    } catch {
      // L'audit ne doit pas bloquer la connexion.
    }

    const res = NextResponse.redirect(new URL('/dashboard', origin))
    const cookie = authOptions.cookies!.sessionToken!
    res.cookies.set(cookie.name!, token, { ...cookie.options, maxAge: MAX_AGE })
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e: any) {
    if (e instanceof OnyxAuthError) {
      await registerLoginFailure(ip, 'sso', 'onyx')
      return fail(e.message)
    }
    if (e instanceof OnyxLinkError) return fail(e.message)
    throw e
  }
}
