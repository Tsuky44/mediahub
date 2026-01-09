import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

let prisma: ReturnType<typeof prismaClientSingleton>

if (process.env.NODE_ENV === 'production') {
  prisma = prismaClientSingleton()
} else {
  if (!globalThis.prisma) {
    globalThis.prisma = prismaClientSingleton()
  }
  
  // Check if models are missing and force recreation if so
  if (globalThis.prisma && !(globalThis.prisma as any).instance && (globalThis.prisma as any).user) {
    console.log('[Prisma] Instance model missing from singleton, recreating client...')
    globalThis.prisma = prismaClientSingleton()
  }
  
  prisma = globalThis.prisma
}

export { prisma }
