import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Database Audit ---')
  
  const requestsCount = await prisma.mediaRequest.count()
  console.log(`Media Requests: ${requestsCount}`)
  
  if (requestsCount > 0) {
    const lastRequests = await prisma.mediaRequest.findMany({
      take: 2,
      orderBy: { requestedAt: 'desc' }
    })
    console.log('Last Requests:', JSON.stringify(lastRequests, null, 2))
  }

  const usersCount = await prisma.user.count()
  console.log(`Users: ${usersCount}`)

  const settings = await (prisma as any).setting?.findMany() || []
  console.log(`Settings entries: ${settings.length}`)
  if (settings.length > 0) {
      console.log('Settings keys:', settings.map((s: any) => s.key))
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
