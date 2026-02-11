import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { EmbyService } from "@/lib/services/emby"
import { RadarrService } from "@/lib/services/radarr"
import { SonarrService } from "@/lib/services/sonarr"
import { ProwlarrService } from '@/lib/services/prowlarr'
import { QBittorrentService } from '@/lib/services/qbittorrent'
import { SmbService } from "@/lib/services/smb"
import { TmdbService } from "@/lib/services/tmdb"
import { getSetting } from "@/lib/settings"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Emby",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        instance: { label: "Instance Slug", type: "text" }, // 'main' par défaut ou le slug de l'instance du pote
        isSwitch: { label: "Is Switch", type: "text" }
      },
      async authorize(credentials, req) {
        if (!prisma || !(prisma as any).instance) {
          console.error("[Auth] Prisma client or Instance model is not available")
          throw new Error("Erreur technique: Base de données non prête")
        }
        const instanceSlug = credentials?.instance || 'main'
        
        // 1. Gérer le switch rapide (si déjà connecté)
        if (credentials?.isSwitch === 'true' && credentials?.username) {
          const session = await getServerSession(authOptions)
          if (session?.user && (session.user.name === credentials.username || session.user.email === credentials.username)) {
            // L'utilisateur est déjà authentifié, on cherche son compte sur l'instance cible
            const instance = await (prisma as any).instance.findUnique({
              where: { slug: instanceSlug }
            })

            if (instance) {
              const emailPrefix = session.user.email?.includes('@') ? session.user.email.split('@')[0] : session.user.email;
              
              const user = await (prisma as any).user.findFirst({
                where: { 
                  instanceId: instance.id,
                  OR: [
                    { name: { contains: session.user.name || '' } },
                    { email: { contains: session.user.email || '' } },
                    { email: { startsWith: `${emailPrefix}@` } }
                  ]
                },
                include: {
                  userRole: { include: { permissions: true } },
                  permissions: true
                }
              })

              if (user) {
                const permissions = Array.from(new Set([
                  ...(user.userRole?.permissions.map((p: any) => p.name) || []),
                  ...(user.permissions?.map((p: any) => p.name) || [])
                ]))

                return {
                  id: user.id.toString(),
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  embyUserId: user.embyUserId,
                  instanceId: instance.id.toString(),
                  instanceSlug: instance.slug,
                  isDefaultInstance: instance.isDefault,
                  role: user.role,
                  permissions,
                  // @ts-ignore
                  roleVersion: user.roleVersion
                }
              }
            }
          }
        }

        if (!credentials?.username || !credentials?.password) {
          return null
        }
        
        // 1. Trouver l'instance
        const instance = await (prisma as any).instance.findUnique({
          where: { slug: instanceSlug }
        })

        if (!instance) {
          console.error(`[Auth] Instance non trouvée: ${instanceSlug}`)
          throw new Error("Serveur non trouvé")
        }

        console.log(`[Auth] Tentative de connexion sur l'instance ${instance.name} (${instanceSlug})`)

        // 2. Initialiser le service Emby pour cette instance
        const embyService = new EmbyService(instance.embyUrl, instance.embyApiKey)

        // 3. Authentifier avec Emby
        try {
          const embyUser = await embyService.authenticate(credentials.username, credentials.password)
          
          if (!embyUser || !embyUser.User) {
            return null
          }

          // 4. Gérer l'utilisateur localement
          // On vérifie d'abord si l'instance a déjà des utilisateurs
          const userCount = await (prisma as any).user.count({
            where: { instanceId: instance.id }
          })
          
          // Le premier utilisateur d'une instance devient admin automatiquement
          const isFirstUser = userCount === 0
          
          let user = await (prisma as any).user.findFirst({
            where: { 
              embyUserId: embyUser.User.Id,
              instanceId: instance.id
            }
          })

          const email = embyUser.User.Email || `${embyUser.User.Name.toLowerCase()}@${instanceSlug}.local`
          
          // Déterminer le rôle à attribuer
          const shouldBeAdmin = isFirstUser || embyUser.User.Policy?.IsAdministrator
          let roleId = undefined
          
          if (shouldBeAdmin) {
            const adminRole = await (prisma as any).role.findUnique({ where: { name: 'admin' } })
            if (adminRole) roleId = adminRole.id
          }

          if (!user) {
            user = await (prisma as any).user.create({
              data: {
                instanceId: instance.id,
                email,
                name: embyUser.User.Name,
                embyUserId: embyUser.User.Id,
                image: embyUser.User.PrimaryImageTag ? embyService.getItemImageUrl(embyUser.User.Id) : null,
                role: shouldBeAdmin ? 'admin' : 'user',
                roleId: roleId // Peut être undefined (donc null) pour les users normaux
              },
              include: {
                userRole: { include: { permissions: true } },
                permissions: true
              }
            })
          } else {
            // Mettre à jour les infos si nécessaire
            const newRole = user.role === 'admin' || shouldBeAdmin ? 'admin' : 'user'
            
            // Si l'utilisateur devient admin ou l'était déjà, on s'assure qu'il a le roleId
            let newRoleId = user.roleId
            if (newRole === 'admin' && (!user.roleId || user.role !== 'admin')) {
               const adminRole = await (prisma as any).role.findUnique({ where: { name: 'admin' } })
               if (adminRole) newRoleId = adminRole.id
            }

            user = await (prisma as any).user.update({
              where: { id: user.id },
              data: {
                name: embyUser.User.Name,
                image: embyUser.User.PrimaryImageTag ? embyService.getItemImageUrl(embyUser.User.Id) : user.image,
                role: newRole,
                roleId: newRoleId
              },
              include: {
                userRole: { include: { permissions: true } },
                permissions: true
              }
            })
          }

          const permissions = Array.from(new Set([
            ...(user.userRole?.permissions.map((p: any) => p.name) || []),
            ...(user.permissions?.map((p: any) => p.name) || [])
          ]))

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            embyUserId: user.embyUserId,
            instanceId: instance.id.toString(),
            instanceSlug: instance.slug,
            isDefaultInstance: instance.isDefault,
            role: user.role,
            permissions,
            // @ts-ignore
            roleVersion: user.roleVersion
          }
        } catch (error: any) {
          console.error("[Auth] Authorize error:", error.message)
          return null
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
        token.role = user.role
        // @ts-ignore
        token.permissions = user.permissions
        // @ts-ignore
        token.roleVersion = user.roleVersion
        // @ts-ignore
        token.instanceId = user.instanceId
        // @ts-ignore
        token.instanceSlug = user.instanceSlug
        // @ts-ignore
        token.isDefaultInstance = user.isDefaultInstance
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
        session.user.role = token.role
        // @ts-ignore
        session.user.permissions = token.permissions
        // @ts-ignore
        session.user.instanceId = token.instanceId
        // @ts-ignore
        session.user.instanceSlug = token.instanceSlug
        // @ts-ignore
        session.user.isDefaultInstance = token.isDefaultInstance
      }
      return session
    }
  }
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user
}

/**
 * Récupère le service Emby pour l'utilisateur actuel
 */
export async function getEmbyServiceForUser() {
  const user = await getCurrentUser()
  if (!user || !(user as any).instanceId) return null

  const instanceId = parseInt((user as any).instanceId)
  if (isNaN(instanceId)) return null
  
  try {
    if (!prisma || !(prisma as any).instance) return null
    const instance = await (prisma as any).instance.findUnique({
      where: { id: instanceId }
    })

    console.debug(`[getEmbyServiceForUser] InstanceId: ${instanceId}, Instance found: ${instance ? instance.name : 'null'}`)

    if (!instance) {
      console.error(`[getEmbyServiceForUser] Instance ${instanceId} non trouvée`)
      return null
    }

    if (!instance.embyUrl || !instance.embyApiKey) {
      console.error(`[getEmbyServiceForUser] Configuration Emby manquante pour l'instance ${instance.name}`)
      return null
    }

    return new EmbyService(instance.embyUrl, instance.embyApiKey)
  } catch (error) {
    console.error(`[getEmbyServiceForUser] Erreur lors de la récupération de l'instance:`, error)
    return null
  }
}



/**
 * Récupère le service Radarr pour l'utilisateur actuel
 */
export async function getRadarrServiceForUser() {
  const user = await getCurrentUser()
  if (!user || !(user as any).instanceId) return null

  const instanceId = parseInt((user as any).instanceId)
  if (isNaN(instanceId)) return null
  
  try {
    const radarrUrl = await getSetting('radarr_url', instanceId)
    const radarrApiKey = await getSetting('radarr_api_key', instanceId)

    if (!radarrUrl || !radarrApiKey) return null

    return new RadarrService(radarrUrl, radarrApiKey)
  } catch (error) {
    console.error(`[getRadarrServiceForUser] Erreur:`, error)
    return null
  }
}

/**
 * Récupère le service Sonarr pour l'utilisateur actuel
 */
export async function getSonarrServiceForUser() {
  const user = await getCurrentUser()
  if (!user || !(user as any).instanceId) return null

  const instanceId = parseInt((user as any).instanceId)
  if (isNaN(instanceId)) return null
  
  try {
    const sonarrUrl = await getSetting('sonarr_url', instanceId)
    const sonarrApiKey = await getSetting('sonarr_api_key', instanceId)

    if (!sonarrUrl || !sonarrApiKey) return null

    return new SonarrService(sonarrUrl, sonarrApiKey)
  } catch (error) {
    console.error(`[getSonarrServiceForUser] Erreur:`, error)
    return null
  }
}

/**
 * Récupère le service Prowlarr pour l'utilisateur actuel ou pour une instance spécifique
 */
export async function getProwlarrServiceForUser(instanceId?: number) {
  let targetInstanceId = instanceId

  if (!targetInstanceId) {
    const user = await getCurrentUser()
    if (!user || !(user as any).instanceId) return null
    targetInstanceId = parseInt((user as any).instanceId)
  }

  if (!targetInstanceId || isNaN(targetInstanceId)) return null
  
  try {
    const prowlarrUrl = await getSetting('prowlarr_url', targetInstanceId)
    const prowlarrApiKey = await getSetting('prowlarr_api_key', targetInstanceId)

    if (!prowlarrUrl || !prowlarrApiKey) return null

    return new ProwlarrService(prowlarrUrl, prowlarrApiKey)
  } catch (error) {
    console.error(`[getProwlarrServiceForUser] Erreur:`, error)
    return null
  }
}

/**
 * Récupère le service QBittorrent pour l'utilisateur actuel
 */
export async function getQBittorrentServiceForUser() {
  const user = await getCurrentUser()
  if (!user || !(user as any).instanceId) return null

  const instanceId = parseInt((user as any).instanceId)
  if (isNaN(instanceId)) return null
  
  try {
    const qbtUrl = await getSetting('qbittorrent_url', instanceId)
    const qbtUsername = await getSetting('qbittorrent_username', instanceId)
    const qbtPassword = await getSetting('qbittorrent_password', instanceId)

    if (!qbtUrl) return null

    return new QBittorrentService(qbtUrl, qbtUsername, qbtPassword)
  } catch (error) {
    console.error(`[getQBittorrentServiceForUser] Erreur:`, error)
    return null
  }
}

/**
 * Récupère le service SMB pour l'utilisateur actuel
 */
export async function getSmbServiceForUser() {
  const user = await getCurrentUser()
  if (!user || !(user as any).instanceId) return null

  const instanceId = parseInt((user as any).instanceId)
  if (isNaN(instanceId)) return null
  
  try {
    const smbHost = await getSetting('smb_host', instanceId)
    const smbShare = await getSetting('smb_share', instanceId)
    const smbUsername = await getSetting('smb_username', instanceId)
    const smbPassword = await getSetting('smb_password', instanceId)
    const smbPath = await getSetting('smb_path', instanceId) || ''

    if (!smbHost || !smbShare) return null

    return new SmbService(smbHost, smbShare, smbUsername, smbPassword, smbPath)
  } catch (error) {
    console.error(`[getSmbServiceForUser] Erreur:`, error)
    return null
  }
}

/**
 * Récupère le service SMB pour une instance spécifique
 */
export async function getSmbServiceByInstanceId(instanceId: number) {
  try {
    const smbHost = await getSetting('smb_host', instanceId)
    const smbShare = await getSetting('smb_share', instanceId)
    const smbUsername = await getSetting('smb_username', instanceId)
    const smbPassword = await getSetting('smb_password', instanceId)
    const smbPath = await getSetting('smb_path', instanceId) || ''

    if (!smbHost || !smbShare) return null

    return new SmbService(smbHost, smbShare, smbUsername, smbPassword, smbPath)
  } catch (error) {
    console.error(`[getSmbServiceByInstanceId] Erreur:`, error)
    return null
  }
}

/**
 * Récupère le service TMDB pour l'utilisateur actuel ou pour une instance spécifique
 */
export async function getTmdbServiceForUser(instanceId?: number) {
  let targetInstanceId = instanceId

  if (!targetInstanceId) {
    const user = await getCurrentUser()
    if (!user || !(user as any).instanceId) {
      // Fallback: use default instance if no user and no instanceId provided
      try {
        if (!prisma || !(prisma as any).instance) {
          console.error(`[getTmdbServiceForUser] Prisma client or Instance model is not available`)
          return null
        }
        const defaultInstance = await (prisma as any).instance.findFirst({ where: { isDefault: true } })
        if (!defaultInstance) return null
        targetInstanceId = defaultInstance.id
      } catch (error) {
        console.error(`[getTmdbServiceForUser] Error fetching default instance:`, error)
        return null
      }
    } else {
      targetInstanceId = parseInt((user as any).instanceId)
    }
  }
  
  if (!targetInstanceId || isNaN(targetInstanceId)) return null
  
  try {
    if (!prisma || !(prisma as any).setting) return null
    let tmdbApiKey = await getSetting('tmdb_api_key', targetInstanceId)
    
    // Si la clé n'est pas trouvée sur l'instance actuelle, on cherche sur l'instance par défaut
    if (!tmdbApiKey) {
      console.warn(`[getTmdbServiceForUser] TMDB API Key not found for instance ${targetInstanceId}, trying default instance`)
      const defaultInstance = await (prisma as any).instance.findFirst({ where: { isDefault: true } })
      if (defaultInstance && defaultInstance.id !== targetInstanceId) {
        tmdbApiKey = await getSetting('tmdb_api_key', defaultInstance.id)
      }
    }

    if (!tmdbApiKey) {
      console.error(`[getTmdbServiceForUser] No TMDB API Key found for instance ${targetInstanceId} or default instance`)
      return null
    }

    console.debug(`[getTmdbServiceForUser] Service initialized with API Key (prefix: ${tmdbApiKey.substring(0, 4)}...)`)
    return new TmdbService(tmdbApiKey)
  } catch (error) {
    console.error(`[getTmdbServiceForUser] Error:`, error)
    return null
  }
}

