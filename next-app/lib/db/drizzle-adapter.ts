/**
 * Adapter Drizzle personnalisé compatible avec Next-Auth v4
 * Gère la conversion entre IDs number (Drizzle) et string (Next-Auth)
 */

import { db } from "./drizzle";
import { users, accounts, sessions, verificationTokens } from "./schema";
import { eq, and } from "drizzle-orm";
import type { Adapter } from "next-auth/adapters";

// Types internes pour gérer la conversion
interface DbUser {
  id: number;
  email: string;
  emailVerified: Date | null;
  name: string;
  image: string | null;
  [key: string]: any;
}

interface DbAccount {
  id: number;
  userId: number;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

interface DbSession {
  id: number;
  sessionToken: string;
  userId: number;
  expires: Date;
}

// Conversion DbUser → AdapterUser (Next-Auth v4)
function toAdapterUser(dbUser: DbUser) {
  return {
    id: dbUser.id.toString(),
    email: dbUser.email,
    emailVerified: dbUser.emailVerified,
    name: dbUser.name,
    image: dbUser.image,
    // Champs personnalisés
    role: dbUser.role,
    embyUserId: dbUser.embyUserId,
    plexUserId: dbUser.plexUserId,
    jellyfinUserId: dbUser.jellyfinUserId,
    discordUserId: dbUser.discordUserId,
    whatsappNumber: dbUser.whatsappNumber,
  } as any;
}

// Conversion DbAccount → AdapterAccount
function toAdapterAccount(dbAccount: DbAccount) {
  return {
    id: dbAccount.id.toString(),
    userId: dbAccount.userId.toString(),
    type: dbAccount.type as any,
    provider: dbAccount.provider,
    providerAccountId: dbAccount.providerAccountId,
    refresh_token: dbAccount.refresh_token ?? undefined,
    access_token: dbAccount.access_token ?? undefined,
    expires_at: dbAccount.expires_at ?? undefined,
    token_type: dbAccount.token_type ?? undefined,
    scope: dbAccount.scope ?? undefined,
    id_token: dbAccount.id_token ?? undefined,
    session_state: dbAccount.session_state ?? undefined,
  } as any;
}

// Conversion DbSession → AdapterSession
function toAdapterSession(dbSession: DbSession) {
  return {
    id: dbSession.id.toString(),
    sessionToken: dbSession.sessionToken,
    userId: dbSession.userId.toString(),
    expires: dbSession.expires,
  } as any;
}

export function DrizzleAdapterNextAuth4(): Adapter {
  return {
    // ============ USER MANAGEMENT ============
    async createUser(userData: { email: string; emailVerified?: Date | null; name?: string | null; image?: string | null }) {
      const result = await db.insert(users).values({
        email: userData.email,
        emailVerified: userData.emailVerified ?? null,
        name: userData.name ?? userData.email.split('@')[0],
        image: userData.image ?? null,
        role: 'user',
      }).returning();

      return toAdapterUser(result[0] as DbUser);
    },

    async getUser(id: string) {
      const result = await db.query.users.findFirst({
        where: eq(users.id, parseInt(id))
      });
      return result ? toAdapterUser(result as DbUser) : null;
    },

    async getUserByEmail(email: string) {
      const result = await db.query.users.findFirst({
        where: eq(users.email, email)
      });
      return result ? toAdapterUser(result as DbUser) : null;
    },

    async getUserByAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      const account = await db.query.accounts.findFirst({
        where: and(
          eq(accounts.providerAccountId, providerAccountId),
          eq(accounts.provider, provider)
        ),
        with: { user: true }
      });

      return account?.user ? toAdapterUser(account.user as DbUser) : null;
    },

    async updateUser(userData) {
      const updateValues: any = {};
      if (userData.email !== undefined) updateValues.email = userData.email;
      if (userData.emailVerified !== undefined) updateValues.emailVerified = userData.emailVerified;
      if (userData.name !== undefined) updateValues.name = userData.name;
      if (userData.image !== undefined) updateValues.image = userData.image;

      const result = await db.update(users)
        .set(updateValues)
        .where(eq(users.id, parseInt(userData.id)))
        .returning();

      return toAdapterUser(result[0] as DbUser);
    },

    async deleteUser(userId: string) {
      await db.delete(users).where(eq(users.id, parseInt(userId)));
    },

    // ============ ACCOUNT MANAGEMENT ============
    async linkAccount(accountData: { userId: string; type: string; provider: string; providerAccountId: string; refresh_token?: string; access_token?: string; expires_at?: number; token_type?: string; scope?: string; id_token?: string; session_state?: string }) {
      await db.insert(accounts).values({
        userId: parseInt(accountData.userId),
        type: accountData.type,
        provider: accountData.provider,
        providerAccountId: accountData.providerAccountId,
        refresh_token: accountData.refresh_token ?? null,
        access_token: accountData.access_token ?? null,
        expires_at: accountData.expires_at ?? null,
        token_type: accountData.token_type ?? null,
        scope: accountData.scope ?? null,
        id_token: accountData.id_token ?? null,
        session_state: accountData.session_state ?? null,
      });
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      await db.delete(accounts).where(
        and(
          eq(accounts.providerAccountId, providerAccountId),
          eq(accounts.provider, provider)
        )
      );
    },

    // ============ SESSION MANAGEMENT ============
    async createSession(sessionData) {
      const result = await db.insert(sessions).values({
        sessionToken: sessionData.sessionToken,
        userId: parseInt(sessionData.userId),
        expires: sessionData.expires,
      }).returning();

      return toAdapterSession(result[0] as DbSession);
    },

    async getSessionAndUser(sessionToken: string) {
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.sessionToken, sessionToken),
        with: { user: true }
      });

      if (!session) return null;

      return {
        session: toAdapterSession(session as DbSession),
        user: toAdapterUser((session as any).user as DbUser),
      };
    },

    async updateSession(sessionData) {
      const result = await db.update(sessions)
        .set({
          expires: sessionData.expires,
        })
        .where(eq(sessions.sessionToken, sessionData.sessionToken))
        .returning();

      return toAdapterSession(result[0] as DbSession);
    },

    async deleteSession(sessionToken: string) {
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },

    // ============ VERIFICATION TOKEN ============
    async createVerificationToken(tokenData) {
      await db.insert(verificationTokens).values({
        identifier: tokenData.identifier,
        token: tokenData.token,
        expires: tokenData.expires,
      });

      return tokenData;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const result = await db.query.verificationTokens.findFirst({
        where: and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token)
        )
      });

      if (!result) return null;

      // Supprimer le token après utilisation
      await db.delete(verificationTokens).where(
        and(
          eq(verificationTokens.identifier, identifier),
          eq(verificationTokens.token, token)
        )
      );

      return {
        identifier: result.identifier,
        token: result.token,
        expires: result.expires,
      } as any;
    },
  };
}
