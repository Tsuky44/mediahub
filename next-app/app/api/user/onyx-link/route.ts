import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getRealUser } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { getOnyxAuthConfig, linkOnyxAccount, OnyxLinkError, unlinkOnyxAccount } from '@/lib/auth/onyx-link'
import { checkRateLimit, clearRateLimit, registerLoginFailure } from '@/lib/auth/rate-limiter'
import { OnyxAuthError, onyxLogin, onyxLogout, onyxVerifyOtp, type OnyxLoginResult } from '@/lib/services/onyx-auth'

function clientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || '127.0.0.1'
}

/** Etat de la liaison du compte connecte. */
export async function GET() {
  const user = await getRealUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const row = await db.query.users.findFirst({ where: eq(users.id, parseInt(user.id)), columns: { onyxUserId: true } })
  const config = await getOnyxAuthConfig()
  return NextResponse.json({ linked: !!row?.onyxUserId, onyxUserId: row?.onyxUserId ?? null, available: config.enabled && !!config.url })
}

/**
 * Lie le compte MediaHub connecte a un compte Onyx, apres verification de ses
 * identifiants (OTP compris) : { username, password } puis { challenge, code }.
 */
export async function POST(request: NextRequest) {
  const user = await getRealUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const config = await getOnyxAuthConfig()
  if (!config.enabled || !config.url) {
    return NextResponse.json({ error: "L'authentification via Onyx n'est pas activée" }, { status: 400 })
  }

  const ip = clientIp(request)
  const subject = `link:${user.id}`
  const rate = await checkRateLimit(ip, subject, 'onyx')
  if (!rate.allowed) {
    return NextResponse.json({ error: `Trop de tentatives. Réessayez dans ${rate.timeLeft} minute(s).` }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  try {
    let result: OnyxLoginResult
    if (typeof body.challenge === 'string' && body.challenge) {
      result = await onyxVerifyOtp(config.url, body.challenge, String(body.code ?? ''))
    } else if (typeof body.username === 'string' && typeof body.password === 'string') {
      result = await onyxLogin(config.url, body.username.trim(), body.password)
    } else {
      return NextResponse.json({ error: 'Identifiants requis' }, { status: 400 })
    }

    if (result.kind === 'otp') {
      if (result.setup) {
        return NextResponse.json({ error: "Onyx impose la validation en deux étapes : configurez-la d'abord dans l'application Onyx" }, { status: 400 })
      }
      return NextResponse.json({ otpRequired: true, challenge: result.challenge })
    }

    await onyxLogout(config.url, result.token)
    await linkOnyxAccount(parseInt(user.id), result.account)
    await clearRateLimit(ip, subject, 'onyx')
    return NextResponse.json({ linked: true, onyxUserId: result.account.id, username: result.account.username })
  } catch (e: any) {
    if (e instanceof OnyxAuthError) {
      await registerLoginFailure(ip, subject, 'onyx')
      return NextResponse.json({ error: e.message }, { status: e.status === 429 ? 429 : 401 })
    }
    if (e instanceof OnyxLinkError) return NextResponse.json({ error: e.message }, { status: 409 })
    throw e
  }
}

export async function DELETE() {
  const user = await getRealUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  await unlinkOnyxAccount(parseInt(user.id))
  return NextResponse.json({ linked: false })
}
