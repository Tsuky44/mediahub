import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db/drizzle"
import { users, settings as settingsTable, roles } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"
import { PlexService } from "@/lib/services/plex"

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };

export const plexProvider = CredentialsProvider({
  id: "plex",
  name: "Plex",
  credentials: {
    username: { label: "Username", type: "text" },
    password: { label: "Password", type: "password" },
    token: { label: "Token", type: "text" }
  },
  async authorize(credentials) {
    if (!db) throw new Error("Erreur technique: Base de données non prête")

    // Check if Plex auth is enabled
    const settings = await db.select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, 'auth_plex_enabled'))
      .union(
        db.select({ key: settingsTable.key, value: settingsTable.value })
          .from(settingsTable)
          .where(eq(settingsTable.key, 'default_role_id'))
      )
    const enabledSetting = settings.find(s => s.key === 'auth_plex_enabled')
    const defaultRoleId = settings.find(s => s.key === 'default_role_id')?.value

    // Fetch admin role for first user or admin users
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, 'admin'))
    const adminRoleId = adminRole?.id

    if (enabledSetting?.value !== 'true') {
      throw new Error("L'authentification via Plex est désactivée")
    }
    
    try {
      const [urlSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'plex_url'))
      const [tokenSetting] = await db.select().from(settingsTable).where(eq(settingsTable.key, 'plex_token'))
      
      const plexUrl = urlSetting?.value || ''
      const plexToken = tokenSetting?.value || ''

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
      const userCount = await db.select({ count: sql`count(*)` }).from(users).get()
      const isFirstUser = userCount?.count === 0
      
      let user = await db.query.users.findFirst({
        where: eq(users.plexUserId, plexUser.Id)
      })

      const email = plexUser.Email || `${plexUser.Name.toLowerCase()}@plex.local`

      if (!user) {
        user = await db.query.users.findFirst({ where: eq(users.email, email) })
        if (user) {
          log(`[Auth] User found by email '${email}' (ID mismatch). Updating Plex ID linkage.`)
        }
      }
      
      let targetRoleName = user?.role || (isFirstUser ? 'admin' : 'user')
      if (isFirstUser) targetRoleName = 'admin'

      if (!user) {
        log(`[Auth] Creating new user: ${plexUser.Name} (${email})`)
        const insertResult = await db.insert(users).values({
          email,
          name: plexUser.Name,
          plexUserId: plexUser.Id,
          image: plexUser.PrimaryImageTag || null,
          role: targetRoleName,
          roleId: isFirstUser ? adminRoleId : defaultRoleId || null,
        }).returning()
        
        user = insertResult[0] || await db.query.users.findFirst({ 
          where: eq(users.email, email), 
          with: { roleRef: true } 
        })

        try {
            const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
            await ExternalNotificationService.send('user_created', {
                title: 'Nouvel utilisateur',
                message: `L'utilisateur ${user?.name} s'est connecté pour la première fois (via Plex).`,
                data: { name: user?.name, email: user?.email, provider: 'Plex' }
            })
        } catch (e) {}

      } else {
        log(`[Auth] Updating existing user: ${user.name} (${user.id})`)
        
        const updateData: any = {
            name: plexUser.Name,
            plexUserId: plexUser.Id,
            image: plexUser.PrimaryImageTag || user.image,
            role: targetRoleName,
        }
        if (targetRoleName === 'admin') {
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
        role: effectiveRole || 'user',
        plexUserId: user?.plexUserId || null,
        embyUserId: user?.embyUserId || null,
        jellyfinUserId: user?.jellyfinUserId || null,
        discordUserId: user?.discordUserId || null,
        whatsappNumber: user?.whatsappNumber || null,
      }
    } catch (e: any) {
      error("[Auth] Plex Authorize error:", e)
      throw new Error(e.message || "Erreur d'authentification Plex")
    }
  }
})
