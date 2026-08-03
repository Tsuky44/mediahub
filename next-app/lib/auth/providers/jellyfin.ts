import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db/drizzle"
import { users, settings as settingsTable, roles } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { JellyfinService } from "@/lib/services/jellyfin"
import { checkRateLimit, registerLoginFailure, clearRateLimit } from "../rate-limiter"

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };

export const jellyfinProvider = CredentialsProvider({
  id: "jellyfin",
  name: "Jellyfin",
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials, req) {
    // Récupérer l'IP du client depuis les en-têtes
    const reqHeaders = req?.headers as any
    const ip = reqHeaders?.['x-forwarded-for']?.split(',')[0]?.trim() || reqHeaders?.['x-real-ip'] || '127.0.0.1'
    const username = credentials?.username || 'unknown'

    // Vérifier si l'utilisateur/IP est actuellement bloqué
    const rateCheck = await checkRateLimit(ip, username, 'jellyfin')
    if (!rateCheck.allowed) {
      throw new Error(`Trop de tentatives de connexion via Jellyfin. Réessayez dans ${rateCheck.timeLeft} minute(s).`)
    }

    if (!db) throw new Error("Erreur technique: Base de données non prête")

    // Check if Jellyfin auth is enabled
    const settings = await db.select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, 'auth_jellyfin_enabled'))
      .union(
        db.select({ key: settingsTable.key, value: settingsTable.value })
          .from(settingsTable)
          .where(eq(settingsTable.key, 'default_role_id'))
      )
    const enabledSetting = settings.find(s => s.key === 'auth_jellyfin_enabled')
    const defaultRoleId = settings.find(s => s.key === 'default_role_id')?.value

    // Fetch admin role for first user or admin users
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'))
    const adminRoleId = adminRole?.id

    if (enabledSetting?.value !== 'true') {
      throw new Error("L'authentification via Jellyfin est désactivée")
    }

    if (!credentials?.username || !credentials?.password) return null
    
    try {
      const [urlSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'jellyfin_url'))
      const [keySetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'jellyfin_api_key'))
      
      const jellyfinUrl = urlSetting?.value || ''
      const jellyfinApiKey = keySetting?.value || ''

      if (!jellyfinUrl) throw new Error("URL Jellyfin non configurée")

      const jellyfinService = new JellyfinService(jellyfinUrl, jellyfinApiKey)

      log(`[Auth] Authenticating user '${credentials.username}' with Jellyfin...`)
      const jellyfinAuth = await jellyfinService.authenticate(credentials.username, credentials.password)
      const jellyfinUser = jellyfinAuth.User

      if (!jellyfinUser || !jellyfinUser.Id) {
        error(`[Auth] Jellyfin returned invalid user data`)
        return null
      }

      // Gérer l'utilisateur localement
      const userCount = await db.select({ count: sql`count(*)` }).from(users).get()
      const isFirstUser = userCount?.count === 0
      
      let user = await db.query.users.findFirst({
        where: eq(users.jellyfinUserId, jellyfinUser.Id)
      })

      const email = `${jellyfinUser.Name.toLowerCase()}@jellyfin.local`

      if (!user) {
        user = await db.query.users.findFirst({ where: eq(users.email, email) })
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
        const insertResult = await db.insert(users).values({
          email,
          name: jellyfinUser.Name,
          jellyfinUserId: jellyfinUser.Id,
          image: jellyfinUser.PrimaryImageTag ? jellyfinService.getItemImageUrl(jellyfinUser.Id) : null,
          role: targetRoleName,
          roleId: shouldBeAdmin ? adminRoleId : defaultRoleId || null,
        }).returning()
        
        user = insertResult[0] || await db.query.users.findFirst({ 
          where: eq(users.email, email), 
          with: { roleRef: true } 
        })

        // V1 notifications supprimées - plus d'envoi de notifications pour nouveaux utilisateurs Jellyfin
        log(`[Auth] New Jellyfin user connected: ${user?.name} (V1 notifications removed)`)

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

        // Migration: utiliser db.update au lieu de prisma.user.update
        await db.update(users)
          .set(updateData)
          .where(eq(users.id, user.id))
          .run()
        
        user = await db.query.users.findFirst({ 
          where: eq(users.id, user.id), 
          with: { roleRef: true } 
        })
      }

      const effectiveRole = (user as any)?.roleRef?.name || user?.role

      await clearRateLimit(ip, username, 'jellyfin')

      return {
        id: user?.id?.toString() || '',
        email: user?.email || '',
        name: user?.name || '',
        image: user?.image || null,
        role: effectiveRole || 'user',
        jellyfinUserId: user?.jellyfinUserId || null,
        embyUserId: user?.embyUserId || null,
        plexUserId: user?.plexUserId || null,
        discordUserId: user?.discordUserId || null,
        whatsappNumber: user?.whatsappNumber || null,
      }
    } catch (e: any) {
      error("[Auth] Jellyfin Authorize error:", e)
      await registerLoginFailure(ip, username, 'jellyfin')
      throw new Error(e.message || "Erreur d'authentification Jellyfin")
    }
  }
})
