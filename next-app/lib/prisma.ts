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
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
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

