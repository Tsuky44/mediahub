import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "@/lib/db/drizzle"
import { users, settings as settingsTable, roles } from "@/lib/db/schema"
import { eq, and, isNull, not } from "drizzle-orm"
import bcrypt from "bcryptjs"

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };

export const localProvider = CredentialsProvider({
  id: "local",
  name: "Compte Local",
  credentials: {
    username: { label: "Nom d'utilisateur", type: "text" },
    password: { label: "Mot de passe", type: "password" }
  },
  async authorize(credentials, req) {
    // Check if Local auth is enabled
    const [setting] = await db.select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, 'auth_local_enabled'))
    const isEnabled = setting ? setting.value === 'true' : true // Default true

    if (!isEnabled) {
      throw new Error("L'authentification locale est désactivée")
    }

    if (!credentials?.username || !credentials?.password) {
      throw new Error("Identifiants manquants")
    }

    // Find user with local password
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.name, credentials.username),
        not(isNull(users.password))
      ),
      with: { roleRef: true }
    })

    if (!user || !user.password) {
      log(`[Local Auth] User not found or no local password: ${credentials.username}`)
      throw new Error("Nom d'utilisateur ou mot de passe incorrect")
    }

    // Verify password
    const isValid = await bcrypt.compare(credentials.password, user.password)
    if (!isValid) {
      log(`[Local Auth] Invalid password for user: ${credentials.username}`)
      throw new Error("Nom d'utilisateur ou mot de passe incorrect")
    }

    log(`[Local Auth] User authenticated: ${user.name}`)

    return {
      id: user.id?.toString() || '',
      email: user.email || '',
      name: user.name || '',
      image: user.image || null,
      role: user.roleRef?.name || user.role || 'user',
      embyUserId: user.embyUserId || null,
      plexUserId: user.plexUserId || null,
      jellyfinUserId: user.jellyfinUserId || null,
      discordUserId: user.discordUserId || null,
      whatsappNumber: user.whatsappNumber || null,
    } as any
  }
})
