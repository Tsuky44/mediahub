import CredentialsProvider from "next-auth/providers/credentials"
import {
  OnyxAuthError, onyxDevicePoll, onyxLogin, onyxLogout, onyxVerifyOtp,
  type OnyxLoginResult, type OnyxPollResult,
} from "@/lib/services/onyx-auth"
import { getOnyxAuthConfig, OnyxLinkError, resolveOnyxUser } from "../onyx-link"
import { checkRateLimit, registerLoginFailure, clearRateLimit } from "../rate-limiter"

/** Messages d'erreur NextAuth que l'écran de connexion interprète. */
export const ONYX_OTP_REQUIRED = 'ONYX_OTP_REQUIRED:'
export const ONYX_PAIRING_PENDING = 'ONYX_PAIRING_PENDING'

export const onyxProvider = CredentialsProvider({
  id: "onyx",
  name: "Onyx",
  credentials: {
    username: { label: "Identifiant Onyx", type: "text" },
    password: { label: "Mot de passe", type: "password" },
    challenge: { label: "Étape OTP", type: "text" },
    otp: { label: "Code de vérification", type: "text" },
    deviceCode: { label: "Appairage", type: "text" },
  },
  async authorize(credentials, req) {
    const reqHeaders = req?.headers as any
    const ip = reqHeaders?.['x-forwarded-for']?.split(',')[0]?.trim() || reqHeaders?.['x-real-ip'] || '127.0.0.1'
    const deviceCode = credentials?.deviceCode?.trim()
    const challenge = credentials?.challenge?.trim()
    // L'appairage et l'étape OTP n'ont pas d'identifiant : on limite par IP.
    const subject = deviceCode ? 'device' : challenge ? 'otp' : (credentials?.username?.trim().toLowerCase() || 'unknown')

    const rateCheck = await checkRateLimit(ip, subject, 'onyx')
    if (!rateCheck.allowed) {
      throw new Error(`Trop de tentatives de connexion via Onyx. Réessayez dans ${rateCheck.timeLeft} minute(s).`)
    }

    const config = await getOnyxAuthConfig()
    if (!config.enabled) throw new Error("L'authentification via Onyx est désactivée")
    if (!config.url) throw new Error("URL Onyx non configurée")

    try {
      let result: OnyxLoginResult | OnyxPollResult
      if (deviceCode) {
        result = await onyxDevicePoll(config.url, deviceCode)
      } else if (challenge) {
        if (!credentials?.otp) return null
        result = await onyxVerifyOtp(config.url, challenge, credentials.otp)
      } else {
        if (!credentials?.username || !credentials?.password) return null
        result = await onyxLogin(config.url, credentials.username.trim(), credentials.password)
      }

      // Ni un appairage en attente ni une étape OTP ne sont des échecs.
      if (result.kind === 'pending') throw new Error(ONYX_PAIRING_PENDING)
      if (result.kind === 'expired') throw new Error("Le code d'appairage a expiré, recommencez")
      if (result.kind === 'otp') {
        if (result.setup) {
          throw new Error("Onyx impose la validation en deux étapes : configurez-la d'abord dans l'application Onyx")
        }
        throw new Error(`${ONYX_OTP_REQUIRED}${result.challenge}`)
      }

      // MediaHub ne garde pas de session Onyx : l'identité suffit.
      await onyxLogout(config.url, result.token)

      const user = await resolveOnyxUser(result.account, config)
      await clearRateLimit(ip, subject, 'onyx')

      return {
        id: String(user.id),
        email: user.email,
        name: user.name,
        image: user.image || null,
        role: user.roleRef?.name || user.role || 'user',
        jellyfinUserId: user.jellyfinUserId || null,
        embyUserId: user.embyUserId || null,
        plexUserId: user.plexUserId || null,
        discordUserId: user.discordUserId || null,
        whatsappNumber: user.whatsappNumber || null,
      }
    } catch (e: any) {
      const message: string = e?.message || "Erreur d'authentification Onyx"
      // Seuls les vrais refus d'Onyx comptent : pas l'attente, l'étape OTP ni l'absence de compte lié.
      if (e instanceof OnyxAuthError) await registerLoginFailure(ip, subject, 'onyx')
      if (!(e instanceof OnyxAuthError) && !(e instanceof OnyxLinkError)) throw e
      throw new Error(message)
    }
  },
})
