/**
 * SHIM DE COMPATIBILITÉ PRISMA → DRIZZLE
 * 
 * Ce fichier fournit une API compatible Prisma qui redirige vers Drizzle.
 * C'est une solution temporaire pour faciliter la migration progressive.
 * 
 * TODO: Migrer tous les fichiers qui importent '@/lib/prisma' vers '@/lib/db/drizzle'
 */

import { db } from './db/drizzle';
import * as schema from './db/schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';

// Helper pour construire des requêtes simples
function buildWhereClause(table: any, where: any): any {
  if (!where) return undefined;
  
  const conditions: any[] = [];
  
  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' && Array.isArray(value)) {
      const andConditions = value.map(w => buildWhereClause(table, w)).filter(Boolean);
      if (andConditions.length > 0) {
        conditions.push(and(...andConditions));
      }
    } else if (key === 'OR' && Array.isArray(value)) {
      const orConditions = value.map(w => buildWhereClause(table, w)).filter(Boolean);
      if (orConditions.length > 0) {
        conditions.push(or(...orConditions));
      }
    } else if (key === 'NOT') {
      // Simplifié - ne supporte pas NOT complexe
    } else if (key === 'in' && Array.isArray(value)) {
      conditions.push(inArray(table[key.replace('_', '')], value));
    } else if (typeof value === 'object' && value !== null) {
      const val = value as Record<string, any>;
      if (val.contains !== undefined) {
        conditions.push(sql`${table[key]} LIKE ${'%' + val.contains + '%'}`);
      } else if (val.startsWith !== undefined) {
        conditions.push(sql`${table[key]} LIKE ${val.startsWith + '%'}`);
      } else if (val.endsWith !== undefined) {
        conditions.push(sql`${table[key]} LIKE ${'%' + val.endsWith}`);
      } else if (val.gt !== undefined) {
        conditions.push(sql`${table[key]} > ${val.gt}`);
      } else if (val.gte !== undefined) {
        conditions.push(sql`${table[key]} >= ${val.gte}`);
      } else if (val.lt !== undefined) {
        conditions.push(sql`${table[key]} < ${val.lt}`);
      } else if (val.lte !== undefined) {
        conditions.push(sql`${table[key]} <= ${val.lte}`);
      }
    } else {
      conditions.push(eq(table[key], value));
    }
  }
  
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

// Créer un proxy Prisma-like pour une table
function createTableProxy(table: any, tableName: string) {
  return {
    // findFirst avec where, include, orderBy
    async findFirst(args: any = {}) {
      let query: any = db.select().from(table);
      
      if (args.where) {
        const whereClause = buildWhereClause(table, args.where);
        if (whereClause) {
          query = query.where(whereClause as any);
        }
      }
      
      if (args.orderBy) {
        const orderCols = Object.entries(args.orderBy).map(([col, dir]) => {
          return dir === 'desc' ? sql`${table[col]} DESC` : sql`${table[col]} ASC`;
        });
        query = query.orderBy(...orderCols);
      }
      
      const result = await query.limit(1);
      return result[0] || null;
    },

    // findMany avec where, include, orderBy
    async findMany(args: any = {}) {
      let query: any = db.select().from(table);
      
      if (args.where) {
        const whereClause = buildWhereClause(table, args.where);
        if (whereClause) {
          query = query.where(whereClause as any);
        }
      }
      
      if (args.orderBy) {
        const orderCols = Object.entries(args.orderBy).map(([col, dir]) => {
          return dir === 'desc' ? sql`${table[col]} DESC` : sql`${table[col]} ASC`;
        });
        query = query.orderBy(...orderCols);
      }
      
      return await query;
    },

    // findUnique
    async findUnique(args: any = {}) {
      let query: any = db.select().from(table);
      if (!args.where) return null;
      const whereClause = buildWhereClause(table, args.where);
      if (!whereClause) return null;
      
      const result = await db.select().from(table).where(whereClause).limit(1);
      return result[0] || null;
    },

    // create
    async create(args: any = {}) {
      if (!args.data) throw new Error('data required for create');
      
      const result = await db.insert(table).values(args.data).returning();
      const resultArray = result as any[];
      return resultArray[0];
    },

    // createMany
    async createMany(args: any = {}) {
      if (!args.data || !Array.isArray(args.data)) throw new Error('data array required for createMany');
      
      await db.insert(table).values(args.data);
      return { count: args.data.length };
    },

    // update
    async update(args: any = {}) {
      if (!args.where || !args.data) throw new Error('where and data required for update');
      
      const whereClause = buildWhereClause(table, args.where);
      if (!whereClause) throw new Error('Invalid where clause');
      
      const result = await db.update(table).set(args.data).where(whereClause).returning();
      const resultArray = result as any[];
      return resultArray[0];
    },

    // updateMany
    async updateMany(args: any = {}) {
      if (!args.where || !args.data) throw new Error('where and data required for updateMany');
      
      const whereClause = buildWhereClause(table, args.where);
      if (!whereClause) throw new Error('Invalid where clause');
      
      await db.update(table).set(args.data).where(whereClause);
      return { count: 1 }; // Approximation
    },

    // delete
    async delete(args: any = {}) {
      if (!args.where) throw new Error('where required for delete');
      
      const whereClause = buildWhereClause(table, args.where);
      if (!whereClause) throw new Error('Invalid where clause');
      
      await db.delete(table).where(whereClause);
    },

    // deleteMany
    async deleteMany(args: any = {}) {
      if (!args.where) throw new Error('where required for deleteMany');
      
      const whereClause = buildWhereClause(table, args.where);
      if (!whereClause) throw new Error('Invalid where clause');
      
      await db.delete(table).where(whereClause);
      return { count: 1 }; // Approximation
    },

    // count
    async count(args: any = {}) {
      let query: any = db.select({ count: sql`count(*)` }).from(table);
      
      if (args.where) {
        const whereClause = buildWhereClause(table, args.where);
        if (whereClause) {
          query = query.where(whereClause as any);
        }
      }
      
      const result = await query;
      return result[0]?.count || 0;
    },
  };
}

// Prisma-like client avec toutes les tables
export const prisma = {
  user: createTableProxy(schema.users, 'users'),
  role: createTableProxy(schema.roles, 'roles'),
  permission: createTableProxy(schema.permissions, 'permissions'),
  setting: createTableProxy(schema.settings, 'settings'),
  auditLog: createTableProxy(schema.auditLogs, 'auditLogs'),
  mediaRequest: createTableProxy(schema.mediaRequests, 'mediaRequests'),
  accountRequest: createTableProxy(schema.accountRequests, 'accountRequests'),
  watchLater: createTableProxy(schema.watchLater, 'watchLater'),
  notification: createTableProxy(schema.notifications, 'notifications'),
  mediaSubscription: createTableProxy(schema.mediaSubscriptions, 'mediaSubscriptions'),
  watchEvent: createTableProxy(schema.watchEvents, 'watchEvents'),
  dailyTrackerStat: createTableProxy(schema.dailyTrackerStats, 'dailyTrackerStats'),
  trackerStatsLog: createTableProxy(schema.trackerStatsLogs, 'trackerStatsLogs'),
  session: createTableProxy(schema.sessions, 'sessions'),
  account: createTableProxy(schema.accounts, 'accounts'),
  verificationToken: createTableProxy(schema.verificationTokens, 'verificationTokens'),
  userGroup: createTableProxy(schema.userGroups, 'userGroups'),
  userGroupMember: createTableProxy(schema.userGroupMembers, 'userGroupMembers'),
  
  // Transaction simplifiée - exécute séquentiellement
  $transaction: async (queries: any[]) => {
    const results = [];
    for (const query of queries) {
      if (typeof query === 'function') {
        results.push(await query(prisma));
      } else {
        results.push(await query);
      }
    }
    return results;
  },
};

// Export par défaut
export default prisma;
