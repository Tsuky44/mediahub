import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Helper to get prisma with model check
export function getPrisma() {
  if (process.env.NODE_ENV === 'production') {
    if (!globalThis.prisma) {
      globalThis.prisma = prismaClientSingleton()
    }
  } else {
    if (!globalThis.prisma) {
      globalThis.prisma = prismaClientSingleton()
    }
    
    // Check if models are missing and force recreation if so
    const p = globalThis.prisma as any
    if (p && !p.instance && p.user) {
      console.log('[Prisma] Instance model missing from singleton, recreating client...')
      globalThis.prisma = prismaClientSingleton()
    }
  }
  return globalThis.prisma as ReturnType<typeof prismaClientSingleton>
}

const prisma = getPrisma()

export { prisma }

