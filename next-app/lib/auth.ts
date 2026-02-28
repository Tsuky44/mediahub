import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import { EmbyService } from "@/lib/services/emby"
import { PlexService } from "@/lib/services/plex"
import { JellyfinService } from "@/lib/services/jellyfin"
import { getTmdbService } from "@/lib/services/tmdb"
import { getRadarrService } from "@/lib/services/radarr"
import { getSonarrService } from "@/lib/services/sonarr"
import { getQBittorrentService } from "@/lib/services/qbittorrent"
import { getSmbService } from "@/lib/services/smb"
import { getProwlarrService } from "@/lib/services/prowlarr"

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: "emby",
      name: "Emby",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!prisma) {
          error("[Auth] Prisma client is not available")
          throw new Error("Erreur technique: Base de données non prête")
        }

        // Check if Emby auth is enabled
        const settings = await prisma.setting.findMany({
          where: {
            key: {
              in: ['auth_emby_enabled', 'default_role_id']
            }
          }
        })
        const enabledSetting = settings.find(s => s.key === 'auth_emby_enabled')
        const defaultRoleId = settings.find(s => s.key === 'default_role_id')?.value
        
        // Fetch admin role for first user or admin users
        const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } })
        const adminRoleId = adminRole?.id

        const isEnabled = enabledSetting ? enabledSetting.value === 'true' : true // Default to true for backward compatibility
        
        if (!isEnabled) {
          throw new Error("L'authentification via Emby est désactivée")
        }

        if (!credentials?.username || !credentials?.password) {
          warn("[Auth] Missing credentials")
          return null
        }
        
        try {
          log("[Auth] Fetching Emby configuration from DB...")
          // Fetch global settings
          const urlSetting = await prisma.setting.findFirst({ where: { key: 'emby_url' } })
          const keySetting = await prisma.setting.findFirst({ where: { key: 'emby_api_key' } })
          
          const embyUrl = urlSetting?.value || process.env.EMBY_URL
          const embyApiKey = keySetting?.value || process.env.EMBY_API_KEY

          log(`[Auth] Configuration status: URL=${!!embyUrl}, Key=${!!embyApiKey}`)

          if (!embyUrl || !embyApiKey) {
            error("[Auth] Emby configuration missing in settings and environment")
            throw new Error("Configuration serveur manquante")
          }

          // Initialiser le service Emby
          const embyService = new EmbyService(embyUrl, embyApiKey)

          // Authentifier avec Emby
          log(`[Auth] Authenticating user '${credentials.username}' with Emby at ${embyUrl}...`)
          const embyUser = await embyService.authenticate(credentials.username, credentials.password)
          log(`[Auth] Emby auth successful. User ID: ${embyUser?.User?.Id}`)
          
          if (!embyUser || !embyUser.User) {
            error(`[Auth] Emby returned invalid user data`)
            return null
          }

          // Gérer l'utilisateur localement
          const userCount = await prisma.user.count()
          const isFirstUser = userCount === 0
          
          let user = await prisma.user.findFirst({
            where: { embyUserId: embyUser.User.Id }
          })

          const email = embyUser.User.Email || `${embyUser.User.Name.toLowerCase()}@local`

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } })
            if (user) {
              log(`[Auth] User found by email '${email}' (ID mismatch). Updating Emby ID linkage.`)
            }
          }
          
          const shouldBeAdmin = isFirstUser || embyUser.User.Policy?.IsAdministrator
          let targetRoleName = user?.role || (shouldBeAdmin ? 'admin' : 'user')
          
          if (shouldBeAdmin) {
            targetRoleName = 'admin'
          } else if (user?.role === 'admin') {
             targetRoleName = 'user'
          }

          if (!user) {
            log(`[Auth] Creating new user: ${embyUser.User.Name} (${email}) with role ${targetRoleName}`)
            user = await prisma.user.create({
              data: {
                email,
                name: embyUser.User.Name,
                embyUserId: embyUser.User.Id,
                image: embyUser.User.PrimaryImageTag ? embyService.getItemImageUrl(embyUser.User.Id) : null,
                role: targetRoleName,
                roleId: shouldBeAdmin ? adminRoleId : defaultRoleId || undefined,
              },
              include: { roleRef: true }
            })
          } else {
            log(`[Auth] Updating existing user: ${user.name} (${user.id})`)
            const updateData: any = {
                name: embyUser.User.Name,
                embyUserId: embyUser.User.Id,
                image: embyUser.User.PrimaryImageTag ? embyService.getItemImageUrl(embyUser.User.Id) : user.image,
                role: targetRoleName,
            }
            // If user becomes admin, clear roleId. If user loses admin, assign default role? 
            // Only clear roleId if becoming admin. Don't force default role on existing users unless they were admin.
            if (shouldBeAdmin) {
                updateData.roleId = adminRoleId || null
            } else if (user.role === 'admin' && targetRoleName === 'user') {
                updateData.roleId = defaultRoleId || null
            }

            user = await prisma.user.update({
              where: { id: user.id },
              data: updateData,
              include: { roleRef: true }
            })
          }

          const effectiveRole = (user as any).roleRef ? (user as any).roleRef.name : user.role

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            embyUserId: user.embyUserId,
            role: effectiveRole,
            plexUserId: user.plexUserId,
            jellyfinUserId: user.jellyfinUserId,
          }
        } catch (error: any) {
          error("[Auth] Authorize error:", error)
          if (error.message.includes("fetch")) throw new Error(`Erreur de connexion à Emby: ${error.message}`)
          if (error.code === 'P2002') throw new Error("Erreur de base de données (conflit unique)")
          throw new Error(error.message || "Erreur d'authentification inconnue")
        }
      }
    }),
    CredentialsProvider({
      id: "plex",
      name: "Plex",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials, req) {
        if (!prisma) throw new Error("Erreur technique: Base de données non prête")

        // Check if Plex auth is enabled
        const settings = await prisma.setting.findMany({
          where: {
            key: {
              in: ['auth_plex_enabled', 'default_role_id']
            }
          }
        })
        const enabledSetting = settings.find(s => s.key === 'auth_plex_enabled')
        const defaultRoleId = settings.find(s => s.key === 'default_role_id')?.value

        // Fetch admin role for first user or admin users
        const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } })
        const adminRoleId = adminRole?.id

        if (enabledSetting?.value !== 'true') {
          throw new Error("L'authentification via Plex est désactivée")
        }
        
        try {
          const urlSetting = await prisma.setting.findFirst({ where: { key: 'plex_url' } })
          const tokenSetting = await prisma.setting.findFirst({ where: { key: 'plex_token' } })
          
          const plexUrl = urlSetting?.value || ''
          const plexToken = tokenSetting?.value || ''

          // Authentifier avec Plex.tv
          const plexService = new PlexService(plexUrl, plexToken)
          let plexAuth;

          if (credentials?.token) {
             log(`[Auth] Authenticating via Plex Token...`)
             plexAuth = await plexService.validateToken(credentials.token)
          } else {
             if (!credentials?.username || !credentials?.password) return null
             log(`[Auth] Authenticating user '${credentials.username}' with Plex...`)
             plexAuth = await plexService.authenticate(credentials.username, credentials.password)
          }

          const plexUser = plexAuth.User
          
          if (!plexUser || !plexUser.Id) {
            error(`[Auth] Plex returned invalid user data`)
            return null
          }

          // Gérer l'utilisateur localement
          const userCount = await prisma.user.count()
          const isFirstUser = userCount === 0
          
          let user = await prisma.user.findFirst({
            where: { plexUserId: plexUser.Id }
          })

          const email = plexUser.Email || `${plexUser.Name.toLowerCase()}@plex.local`

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } })
            if (user) {
              log(`[Auth] User found by email '${email}' (ID mismatch). Updating Plex ID linkage.`)
            }
          }
          
          // Plex doesn't have a simple "admin" flag in the user object like Emby
          // We rely on first user or existing role
          let targetRoleName = user?.role || (isFirstUser ? 'admin' : 'user')
          
          if (isFirstUser) targetRoleName = 'admin'

          if (!user) {
            log(`[Auth] Creating new user: ${plexUser.Name} (${email})`)
            user = await prisma.user.create({
              data: {
                email,
                name: plexUser.Name,
                plexUserId: plexUser.Id,
                image: plexUser.PrimaryImageTag || null, // Plex returns URL
                role: targetRoleName,
                roleId: isFirstUser ? adminRoleId : defaultRoleId || undefined,
              },
              include: { roleRef: true }
            })
          } else {
            log(`[Auth] Updating existing user: ${user.name} (${user.id})`)
            
            const updateData: any = {
                name: plexUser.Name,
                plexUserId: plexUser.Id,
                image: plexUser.PrimaryImageTag || user.image,
                role: targetRoleName,
            }
            // For Plex, we don't sync admin status as reliably, but isFirstUser check is already done.
            // If we are admin (role='admin'), keep it?
            // If user role was admin and now becomes user? (Logic above handles targetRoleName)
            if (targetRoleName === 'admin') {
                updateData.roleId = adminRoleId || null
            } else if (user.role === 'admin' && targetRoleName === 'user') {
                updateData.roleId = defaultRoleId || null
            }

            user = await prisma.user.update({
              where: { id: user.id },
              data: updateData,
              include: { roleRef: true }
            })
          }

          const effectiveRole = (user as any).roleRef ? (user as any).roleRef.name : user.role

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: effectiveRole,
            plexUserId: user.plexUserId,
            embyUserId: user.embyUserId,
            jellyfinUserId: user.jellyfinUserId,
          }
        } catch (error: any) {
          error("[Auth] Plex Authorize error:", error)
          throw new Error(error.message || "Erreur d'authentification Plex")
        }
      }
    }),
    CredentialsProvider({
      id: "jellyfin",
      name: "Jellyfin",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!prisma) throw new Error("Erreur technique: Base de données non prête")

        // Check if Jellyfin auth is enabled
        const settings = await prisma.setting.findMany({
          where: {
            key: {
              in: ['auth_jellyfin_enabled', 'default_role_id']
            }
          }
        })
        const enabledSetting = settings.find(s => s.key === 'auth_jellyfin_enabled')
        const defaultRoleId = settings.find(s => s.key === 'default_role_id')?.value

        // Fetch admin role for first user or admin users
        const adminRole = await prisma.role.findFirst({ where: { name: 'admin' } })
        const adminRoleId = adminRole?.id

        if (enabledSetting?.value !== 'true') {
          throw new Error("L'authentification via Jellyfin est désactivée")
        }

        if (!credentials?.username || !credentials?.password) return null
        
        try {
          const urlSetting = await prisma.setting.findFirst({ where: { key: 'jellyfin_url' } })
          const keySetting = await prisma.setting.findFirst({ where: { key: 'jellyfin_api_key' } })
          
          const jellyfinUrl = urlSetting?.value || ''
          const jellyfinApiKey = keySetting?.value || ''

          if (!jellyfinUrl) throw new Error("URL Jellyfin non configurée")

          const jellyfinService = new JellyfinService(jellyfinUrl, jellyfinApiKey)

          log(`[Auth] Authenticating user '${credentials.username}' with Jellyfin at ${jellyfinUrl}...`)
          const jellyfinAuth = await jellyfinService.authenticate(credentials.username, credentials.password)
          const jellyfinUser = jellyfinAuth.User

          if (!jellyfinUser || !jellyfinUser.Id) {
            error(`[Auth] Jellyfin returned invalid user data`)
            return null
          }

          // Gérer l'utilisateur localement
          const userCount = await prisma.user.count()
          const isFirstUser = userCount === 0
          
          let user = await prisma.user.findFirst({
            where: { jellyfinUserId: jellyfinUser.Id }
          })

          const email = `${jellyfinUser.Name.toLowerCase()}@jellyfin.local` // Jellyfin might not return email

          if (!user) {
            user = await prisma.user.findUnique({ where: { email } })
            if (user) {
              log(`[Auth] User found by email '${email}' (ID mismatch). Updating Jellyfin ID linkage.`)
            }
          }
          
          const shouldBeAdmin = isFirstUser || jellyfinUser.Policy?.IsAdministrator
          let targetRoleName = user?.role || (shouldBeAdmin ? 'admin' : 'user')
          
          if (shouldBeAdmin) targetRoleName = 'admin'
          else if (user?.role === 'admin') targetRoleName = 'user'

          if (!user) {
            log(`[Auth] Creating new user: ${jellyfinUser.Name} (${email})`)
            user = await prisma.user.create({
              data: {
                email,
                name: jellyfinUser.Name,
                jellyfinUserId: jellyfinUser.Id,
                image: jellyfinUser.PrimaryImageTag ? jellyfinService.getItemImageUrl(jellyfinUser.Id) : null,
                role: targetRoleName,
                roleId: shouldBeAdmin ? adminRoleId : defaultRoleId || undefined,
              },
              include: { roleRef: true }
            })
          } else {
            log(`[Auth] Updating existing user: ${user.name} (${user.id})`)
            const updateData: any = {
                name: jellyfinUser.Name,
                jellyfinUserId: jellyfinUser.Id,
                image: jellyfinUser.PrimaryImageTag ? jellyfinService.getItemImageUrl(jellyfinUser.Id) : user.image,
                role: targetRoleName,
            }
            
            if (shouldBeAdmin) {
                updateData.roleId = adminRoleId || null
            } else if (user.role === 'admin' && targetRoleName === 'user') {
                updateData.roleId = defaultRoleId || null
            }

            user = await prisma.user.update({
              where: { id: user.id },
              data: updateData,
              include: { roleRef: true }
            })
          }

          const effectiveRole = (user as any).roleRef ? (user as any).roleRef.name : user.role

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: effectiveRole,
            jellyfinUserId: user.jellyfinUserId,
            embyUserId: user.embyUserId,
            plexUserId: user.plexUserId,
          }
        } catch (error: any) {
          error("[Auth] Jellyfin Authorize error:", error)
          throw new Error(error.message || "Erreur d'authentification Jellyfin")
        }
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
        token.plexUserId = user.plexUserId
        // @ts-ignore
        token.jellyfinUserId = user.jellyfinUserId
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
        session.user.embyUserId = token.embyUserId
        // @ts-ignore
        session.user.plexUserId = token.plexUserId
        // @ts-ignore
        session.user.jellyfinUserId = token.jellyfinUserId
        
        // Force refresh user from DB to get latest role and permissions
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: parseInt(token.sub as string) },
            include: { roleRef: { include: { permissions: true } } }
          })

          if (dbUser) {
            const effectiveRole = dbUser.roleRef ? dbUser.roleRef.name : dbUser.role
            // @ts-ignore
            session.user.role = effectiveRole
            // @ts-ignore
            session.user.permissions = dbUser.roleRef ? dbUser.roleRef.permissions : []
            // @ts-ignore
            session.user.image = dbUser.image
            // @ts-ignore
            session.user.embyUserId = dbUser.embyUserId
            // @ts-ignore
            session.user.plexUserId = dbUser.plexUserId
            // @ts-ignore
            session.user.jellyfinUserId = dbUser.jellyfinUserId
            
            // Impersonation logic
            if (effectiveRole === 'admin') {
              try {
                const cookieStore = await cookies()
                const impersonateId = cookieStore.get('mediahub_impersonate')?.value
                
                if (impersonateId) {
                  const role = await prisma.role.findUnique({
                    where: { id: impersonateId },
                    include: { permissions: true }
                  })

                  if (role) {
                    // Override user role and permissions
                    (session.user as any).role = role.name;
                    (session.user as any).permissions = role.permissions;
                    (session.user as any).isImpersonated = true;
                    (session.user as any).originalRole = 'admin';
                  }
                }
              } catch (e) {
                // Ignore errors (e.g. if cookies() is not available)
              }
            }
          }
        } catch (e) {
          error("Failed to refresh session user", e)
          // Fallback to token if DB fails
          // @ts-ignore
          session.user.role = token.role
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

  // If impersonated, refetch the real user from DB
  if ((session.user as any).isImpersonated) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: parseInt((session.user as any).id) },
        include: { roleRef: { include: { permissions: true } } }
      })
      if (dbUser) {
        // Construct user object
        const realUser = {
          ...session.user,
          role: dbUser.roleRef ? dbUser.roleRef.name : dbUser.role,
          permissions: dbUser.roleRef ? dbUser.roleRef.permissions : [],
          isImpersonated: false
        }
        return realUser
      }
    } catch (e) {
      error("Failed to fetch real user", e)
    }
  }

  return session.user
}

/**
 * Récupère le service Emby pour l'utilisateur actuel
 */
export async function getEmbyServiceForUser() {
  const urlSetting = await prisma.setting.findFirst({ where: { key: 'emby_url' } })
  const keySetting = await prisma.setting.findFirst({ where: { key: 'emby_api_key' } })
  
  const embyUrl = urlSetting?.value || process.env.EMBY_URL
  const embyApiKey = keySetting?.value || process.env.EMBY_API_KEY

  if (!embyUrl || !embyApiKey) {
    error(`[getEmbyServiceForUser] Configuration Emby manquante`)
    return null
  }

  return new EmbyService(embyUrl, embyApiKey)
}

/**
 * Récupère le service Plex pour l'utilisateur actuel
 */
export async function getPlexServiceForUser() {
  const urlSetting = await prisma.setting.findFirst({ where: { key: 'plex_url' } })
  const tokenSetting = await prisma.setting.findFirst({ where: { key: 'plex_token' } })
  
  const plexUrl = urlSetting?.value || ''
  const plexToken = tokenSetting?.value || ''

  if (!plexUrl || !plexToken) {
    error(`[getPlexServiceForUser] Configuration Plex manquante`)
    return null
  }

  return new PlexService(plexUrl, plexToken)
}

/**
 * Récupère le service Jellyfin pour l'utilisateur actuel
 */
export async function getJellyfinServiceForUser() {
  const urlSetting = await prisma.setting.findFirst({ where: { key: 'jellyfin_url' } })
  const keySetting = await prisma.setting.findFirst({ where: { key: 'jellyfin_api_key' } })
  
  const jellyfinUrl = urlSetting?.value || ''
  const jellyfinApiKey = keySetting?.value || ''

  if (!jellyfinUrl) {
    error(`[getJellyfinServiceForUser] Configuration Jellyfin manquante`)
    return null
  }

  return new JellyfinService(jellyfinUrl, jellyfinApiKey)
}

export async function getTmdbServiceForUser() {
  return await getTmdbService()
}

export async function getRadarrServiceForUser() {
  return await getRadarrService()
}

export async function getSonarrServiceForUser() {
  return await getSonarrService()
}

export async function getQBittorrentServiceForUser() {
  return await getQBittorrentService()
}

export async function getSmbServiceForUser() {
  return await getSmbService()
}

export async function getProwlarrServiceForUser() {
  return await getProwlarrService()
}
