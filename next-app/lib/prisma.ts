import { PrismaClient } from '@prisma/client'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


// Patch 14: Serialisation BigInt pour JSON.stringify / NextResponse.json()
// Nécessaire car les modèles Prisma DailyTrackerStat et TrackerStatsLog ont des champs
// BigInt (totalUploaded, totalDownloaded, etc.) qui ne sont pas sérialisables nativement.
// Guard idempotent : ne patch qu'une seule fois si non déjà défini.
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

const prismaClientSingleton = () => {
  log('[Prisma] Creating new PrismaClient instance')
  // Par défaut en dev: seulement error/warn pour ne pas polluer le terminal.
  // Pour activer les logs SQL: DEBUG_PRISMA=true (ou DEBUG_PRISMA=query).
  const debugPrisma = process.env.DEBUG_PRISMA
  const logLevels: Array<'query' | 'error' | 'warn' | 'info'> =
    debugPrisma === 'true' || debugPrisma === 'query'
      ? ['query', 'error', 'warn']
      : process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error']
  return new PrismaClient({ log: logLevels })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Helper to get prisma with model check
export function getPrisma() {
  if (!globalThis.prisma) {
    globalThis.prisma = prismaClientSingleton()
  }
  
  return globalThis.prisma as ReturnType<typeof prismaClientSingleton>
}

const prisma = getPrisma()

export { prisma }

