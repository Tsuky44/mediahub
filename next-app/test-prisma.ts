import { prisma } from './lib/prisma'

async function main() {
  console.log('Prisma keys:', Object.keys(prisma))
  try {
    const count = await (prisma as any).instance.count()
    console.log('Instance count:', count)
  } catch (e: any) {
    console.error('Error accessing instance:', e.message)
  }
}

main()
