import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: 'MEDIA_REQUEST'
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 5
  })
  
  console.log(logs)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
