import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      embyUserId: string | null
      plexUserId: string | null
      jellyfinUserId: string | null
      discordUserId: string | null
      whatsappNumber: string | null
      image: string | null
      isImpersonated?: boolean
      originalRole?: string
      permissions?: Array<{ action: string; subject: string; conditions?: string | null }>
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    embyUserId: string | null
    plexUserId: string | null
    jellyfinUserId: string | null
    discordUserId: string | null
    whatsappNumber: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    embyUserId: string | null
    plexUserId: string | null
    jellyfinUserId: string | null
    discordUserId: string | null
    whatsappNumber: string | null
  }
}
