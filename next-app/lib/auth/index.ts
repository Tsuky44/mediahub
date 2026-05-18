import { NextAuthOptions, getServerSession } from "next-auth"
import { DrizzleAdapterNextAuth4 } from "@/lib/db/drizzle-adapter"
import { db } from "@/lib/db/drizzle"
import { users, roles } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
// Import providers
import { localProvider } from "./providers/local"
import { embyProvider } from "./providers/emby"
import { plexProvider } from "./providers/plex"
import { jellyfinProvider } from "./providers/jellyfin"

import { logger } from '@/lib/logger'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: DrizzleAdapterNextAuth4() as unknown as NextAuthOptions['adapter'],
  providers: [
    localProvider,
    embyProvider,
    plexProvider,
    jellyfinProvider,
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        maxAge: 30 * 24 * 60 * 60,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  events: {
    async signIn(message) {
      if (message.user && message.user.id) {
        try {
          const { logAction } = await import('@/lib/audit');
          await logAction(
            parseInt(message.user.id),
            'USER_LOGIN',
            'User',
            message.user.id,
            { provider: message.account?.provider }
          );
        } catch (e) {
          console.error('Failed to log sign in:', e);
        }
      }
    },
    async signOut(message) {
      const userId = message?.token?.sub || message?.session?.user?.id;
      if (userId) {
        try {
          const { logAction } = await import('@/lib/audit');
          await logAction(
            parseInt(userId),
            'USER_LOGOUT',
            'User',
            userId
          );
        } catch (e) {
          console.error('Failed to log sign out:', e);
        }
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.embyUserId = user.embyUserId
        token.plexUserId = user.plexUserId
        token.jellyfinUserId = user.jellyfinUserId
        token.discordUserId = user.discordUserId
        token.whatsappNumber = user.whatsappNumber
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? ''
        session.user.embyUserId = token.embyUserId ?? null
        session.user.plexUserId = token.plexUserId ?? null
        session.user.jellyfinUserId = token.jellyfinUserId ?? null
        session.user.discordUserId = token.discordUserId ?? null
        session.user.whatsappNumber = token.whatsappNumber ?? null

        // Force refresh user from DB to get latest role and permissions
        try {
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, parseInt(token.sub ?? '0')),
            with: { roleRef: { with: { permissions: true } } }
          })

          if (dbUser) {
            const effectiveRole = dbUser.roleRef ? dbUser.roleRef.name : dbUser.role
            session.user.role = effectiveRole
            session.user.permissions = dbUser.roleRef ? dbUser.roleRef.permissions : []
            session.user.image = dbUser.image ?? null
            session.user.embyUserId = dbUser.embyUserId ?? null
            session.user.plexUserId = dbUser.plexUserId ?? null
            session.user.jellyfinUserId = dbUser.jellyfinUserId ?? null
            session.user.discordUserId = dbUser.discordUserId ?? null
            session.user.whatsappNumber = dbUser.whatsappNumber ?? null

            // Impersonation logic
            if (effectiveRole === 'admin') {
              try {
                const cookieStore = await cookies()
                const impersonateId = cookieStore.get('mediahub_impersonate')?.value

                if (impersonateId) {
                  const role = await db.query.roles.findFirst({
                    where: eq(roles.id, impersonateId),
                    with: { permissions: true }
                  })

                  if (role) {
                    session.user.role = role.name
                    session.user.permissions = role.permissions
                    session.user.isImpersonated = true
                    session.user.originalRole = 'admin'
                  }
                }
              } catch {
                // Ignore errors
              }
            }
          }
        } catch (e) {
          logger.error("Failed to refresh session user", e)
          session.user.role = token.role ?? 'user'
        }
      }
      return session
    }
  }
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

export async function getRealUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  if (session.user.isImpersonated) {
    try {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, parseInt(session.user.id)),
        with: { roleRef: { with: { permissions: true } } }
      })
      if (dbUser) {
        return {
          ...session.user,
          role: session.user.originalRole || dbUser.role,
          permissions: dbUser.roleRef ? dbUser.roleRef.permissions : []
        }
      }
    } catch (e) {
      logger.error("Failed to fetch real user", e)
    }
  }

  return session.user
}
