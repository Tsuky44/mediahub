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

        // Try to authenticate with Emby first
        const embyUser = await embyService.authenticate(credentials.username, credentials.password)

        if (embyUser && embyUser.User) {
            // Check if user exists in our DB
            let user = await prisma.user.findFirst({
                where: { embyUserId: embyUser.User.Id }
            })

            if (!user) {
                // Check by email if possible or username
                // Emby might not return email in this call depending on privacy settings
                // We'll create a new user or link by username
                // For safety, let's look up by username if email is missing (assuming username uniqueness locally)
                
                // Note: We need a unique email for Prisma User model. 
                // If Emby doesn't give one, we might need to fake it or ask user.
                // For now, let's assume we can construct one or use what we have.
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

            return {
                id: user.id.toString(),
                email: user.email,
                name: user.name,
                image: user.image,
                embyUserId: user.embyUserId,
                role: user.role
            }
        }

        // Fallback to local auth if Emby fails (optional)
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
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.embyUserId = user.embyUserId
        // @ts-ignore
        token.role = user.role
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
