import { PrismaClient } from '@prisma/client'

// FIX: Global BigInt serialization for JSON
// This prevents crashes when sending objects containing BigInt (like EmbyActivityLog) in API responses
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}

const prismaClientSingleton = () => {
  console.log('[Prisma] Creating new PrismaClient instance')
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
  
  // Check if critical models are missing and force recreation if so
  const p = globalThis.prisma as any
  if (p && (!p.embyLiveSession || !p.embyActivityLog) && p.instance) {
    console.log('[Prisma] Critical models (embyLiveSession/embyActivityLog) missing from singleton, recreating client...')
    globalThis.prisma = prismaClientSingleton()
  }
  
  return globalThis.prisma as ReturnType<typeof prismaClientSingleton>
}

const prisma = getPrisma()

export { prisma }

