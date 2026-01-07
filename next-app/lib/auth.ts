import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { embyService } from "@/lib/services/emby"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Emby",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        console.log(`[Auth] Attempting login for ${credentials.username}`)

        // Try to authenticate with Emby first
        try {
          const embyUser = await embyService.authenticate(credentials.username, credentials.password)
          console.log(`[Auth] Emby auth successful for ${credentials.username}`)

          if (embyUser && embyUser.User) {
              // Check if user exists in our DB
              let user = await prisma.user.findFirst({
                  where: { embyUserId: embyUser.User.Id }
              })

              if (!user) {
                  console.log(`[Auth] User not found in DB, creating/updating...`)
                  const email = embyUser.User.Email || `${embyUser.User.Name.toLowerCase()}@emby.local`
                  
                  user = await prisma.user.upsert({
                      where: { email },
                      update: {
                          embyUserId: embyUser.User.Id,
                          name: embyUser.User.Name,
                          image: embyUser.User.PrimaryImageTag ? `/api/media/image/${embyUser.User.Id}?type=Primary` : null
                      },
                      create: {
                          email,
                          name: embyUser.User.Name,
                          embyUserId: embyUser.User.Id,
                          image: embyUser.User.PrimaryImageTag ? `/api/media/image/${embyUser.User.Id}?type=Primary` : null,
                          role: embyUser.User.Policy?.IsAdministrator ? 'admin' : 'user'
                      }
                  })
              }

              console.log(`[Auth] Returning user object for ${user.name} with role ${user.role}`)
              return {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    embyUserId: user.embyUserId,
                    role: user.role,
                    // @ts-ignore
                    roleVersion: user.roleVersion
                }
          }
        } catch (error: any) {
          console.error("[Auth] Authorize error:", error.message)
          return null // Return null instead of throwing to avoid 500 error
        }
        
        return null
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        // @ts-ignore
        token.embyUserId = user.embyUserId
        // @ts-ignore
        token.role = user.role
        // @ts-ignore
        token.roleVersion = user.roleVersion
      }

      // Check for role change on every request to force logout if needed
      if (token.sub && !user) { // Only check on subsequent requests, not on initial login
        try {
          const userId = parseInt(token.sub)
          if (!isNaN(userId)) {
            const dbUser = await prisma.user.findUnique({
              where: { id: userId },
              select: { 
                // @ts-ignore
                roleVersion: true, 
                role: true 
              }
            })

            if (dbUser) {
              // If the role version in DB is different from the one in token, 
              // it means the role was changed. We force a logout by throwing or 
              // we could update the token, but the user wants a forced logout.
              // @ts-ignore
              if (dbUser.roleVersion !== token.roleVersion) {
                // By returning null or throwing, we invalidate the session
                return null as any
              }
            }
          }
        } catch (error) {
          console.error("JWT verification error:", error)
          // On error, we might want to continue or logout. 
          // Let's continue to avoid locking out users if DB is temporarily down.
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        // @ts-ignore
        session.user.id = token.sub
        // @ts-ignore
        session.user.embyUserId = token.embyUserId || token.sub
        // @ts-ignore
        session.user.role = token.role
      }
      return session
    }
  }
}

import { getServerSession } from "next-auth"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}
