import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const embyUrl = await (prisma as any).setting.findUnique({ where: { key: 'emby_url' } })
  if (embyUrl && embyUrl.value.includes('/web/index.html')) {
    const newValue = embyUrl.value.split('/web/')[0]
    await (prisma as any).setting.update({
      where: { key: 'emby_url' },
      data: { value: newValue }
    })
    console.log(`Updated Emby URL from ${embyUrl.value} to ${newValue}`)
  } else {
    console.log('Emby URL looks OK or not found')
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
