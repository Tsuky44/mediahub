import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const instances = await (prisma as any).instance.findMany()
  
  for (const instance of instances) {
    if (instance.embyUrl.includes('/web/index.html')) {
      const newValue = instance.embyUrl.split('/web/')[0]
      await (prisma as any).instance.update({
        where: { id: instance.id },
        data: { embyUrl: newValue }
      })
      console.log(`Updated Emby URL for instance ${instance.name} from ${instance.embyUrl} to ${newValue}`)
    } else {
      console.log(`Emby URL for instance ${instance.name} looks OK`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
