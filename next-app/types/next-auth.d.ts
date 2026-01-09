import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      embyUserId: string | null
      instanceId: string
      instanceSlug: string
      isDefaultInstance: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    roleVersion: number
    embyUserId: string | null
    instanceId: string
    instanceSlug: string
    isDefaultInstance: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    roleVersion: number
    embyUserId: string | null
    instanceId: string
    instanceSlug: string
    isDefaultInstance: boolean
  }
}
