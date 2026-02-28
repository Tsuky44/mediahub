import { PrismaClient } from '@prisma/client'

const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
const log = (...args: any[]) => { if (isDev) console.log(...args); };
const error = (...args: any[]) => { if (isDev) console.error(...args); };
const warn = (...args: any[]) => { if (isDev) console.warn(...args); };


// FIX: Global BigInt serialization for JSON
// This prevents crashes when sending objects containing BigInt (like EmbyActivityLog) in API responses
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
  
  // Check if critical models are missing and force recreation if so
  const p = globalThis.prisma as any
  if (p && !p.dockerGroup) {
    log('[Prisma] dockerGroup model missing from singleton, recreating client...')
    globalThis.prisma = prismaClientSingleton()
  }
  
  return globalThis.prisma as ReturnType<typeof prismaClientSingleton>
}

const prisma = getPrisma()

export { prisma }

