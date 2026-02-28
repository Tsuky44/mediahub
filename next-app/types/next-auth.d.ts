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
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    embyUserId: string | null
    plexUserId: string | null
    jellyfinUserId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    embyUserId: string | null
    plexUserId: string | null
    jellyfinUserId: string | null
  }
}
