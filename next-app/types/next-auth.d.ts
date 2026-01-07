import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      embyUserId: string | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    roleVersion: number
    embyUserId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    roleVersion: number
    embyUserId: string | null
  }
}
