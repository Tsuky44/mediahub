import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db/drizzle"
import { users, settings as settingsTable, roles } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { EmbyService } from "@/lib/services/emby"

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };

export const embyProvider = CredentialsProvider({
  id: "emby",
  name: "Emby",
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    if (!db) {
      error("[Auth] Database client is not available")
      throw new Error("Erreur technique: Base de données non prête")
    }

    // Check if Emby auth is enabled
    const settings = await db.select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, 'auth_emby_enabled'))
      .union(
        db.select({ key: settingsTable.key, value: settingsTable.value })
          .from(settingsTable)
          .where(eq(settingsTable.key, 'default_role_id'))
      )
    const enabledSetting = settings.find(s => s.key === 'auth_emby_enabled')
    const defaultRoleId = settings.find(s => s.key === 'default_role_id')?.value
    
    // Fetch admin role for first user or admin users
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'))
    const adminRoleId = adminRole?.id

    const isEnabled = enabledSetting ? enabledSetting.value === 'true' : true
    
    if (!isEnabled) {
      throw new Error("L'authentification via Emby est désactivée")
    }

    if (!credentials?.username || !credentials?.password) {
      throw new Error("Identifiants manquants")
    }
    
    try {
      log("[Auth] Fetching Emby configuration from DB...")
      const [urlSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'emby_url'))
      const [keySetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'emby_api_key'))
      
      const embyUrl = urlSetting?.value || process.env.EMBY_URL
      const embyApiKey = keySetting?.value || process.env.EMBY_API_KEY

      if (!embyUrl || !embyApiKey) {
        throw new Error("Configuration serveur manquante")
      }

      const embyService = new EmbyService(embyUrl, embyApiKey)
      const embyUser = await embyService.authenticate(credentials.username, credentials.password)
      
      if (!embyUser || !embyUser.User) {
        throw new Error("Authentification Emby échouée")
      }

      // Gérer l'utilisateur localement
      const userCount = await db.select({ count: sql`count(*)` }).from(users).get()
      const isFirstUser = userCount?.count === 0
      
      let user = await db.query.users.findFirst({
        where: eq(users.embyUserId, embyUser.User.Id)
      })

      const email = embyUser.User.Email || `${embyUser.User.Name.toLowerCase()}@local`

      if (!user) {
        user = await db.query.users.findFirst({ where: eq(users.email, email) })
      }
      
      const shouldBeAdmin = isFirstUser || embyUser.User.Policy?.IsAdministrator
      let targetRoleName = user?.role || (shouldBeAdmin ? 'admin' : 'user')
      
      if (shouldBeAdmin) {
        targetRoleName = 'admin'
      } else if (user?.role === 'admin') {
         targetRoleName = 'user'
      }

      if (!user) {
        log(`[Auth] Creating new user: ${embyUser.User.Name} (${email})`)
        const insertResult = await db.insert(users).values({
          email,
          name: embyUser.User.Name,
          embyUserId: embyUser.User.Id,
          image: embyUser.User.PrimaryImageTag ? embyService.getItemImageUrl(embyUser.User.Id) : null,
          role: targetRoleName,
          roleId: shouldBeAdmin ? adminRoleId : defaultRoleId || null,
        }).returning()
        user = insertResult[0] || await db.query.users.findFirst({ where: eq(users.email, email), with: { roleRef: true } })

        // V1 notifications supprimées - plus d'envoi de notifications pour nouveaux utilisateurs Emby
        log(`[Auth] New Emby user connected: ${user?.name} (V1 notifications removed)`)

      } else {
        log(`[Auth] Updating existing user: ${user.name} (${user.id})`)
        const updateData: any = {
            name: embyUser.User.Name,
            embyUserId: embyUser.User.Id,
            image: embyUser.User.PrimaryImageTag ? embyService.getItemImageUrl(embyUser.User.Id) : user.image,
            role: targetRoleName,
        }
        if (shouldBeAdmin) {
            updateData.roleId = adminRoleId || null
        } else if (user.role === 'admin' && targetRoleName === 'user') {
            updateData.roleId = defaultRoleId || null
        }

        // CORRECTION: Utiliser db.update au lieu de prisma.user.update
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

      return {
        id: user?.id?.toString() || '',
        email: user?.email || '',
        name: user?.name || '',
        image: user?.image || null,
        embyUserId: user?.embyUserId || null,
        role: effectiveRole || 'user',
        plexUserId: user?.plexUserId || null,
        jellyfinUserId: user?.jellyfinUserId || null,
        discordUserId: user?.discordUserId || null,
        whatsappNumber: user?.whatsappNumber || null,
      }
    } catch (e: any) {
      error("[Auth] Authorize error:", e)
      if (e.message?.includes("fetch")) throw new Error(`Erreur de connexion à Emby: ${e.message}`)
      throw new Error(e.message || "Erreur d'authentification inconnue")
    }
  }
})
