const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Initialisation de l\'instance par défaut...')

  const embyUrl = process.env.EMBY_URL
  const embyApiKey = process.env.EMBY_API_KEY
  const jellyseerrUrl = process.env.JELLYSEERR_URL
  const jellyseerrApiKey = process.env.JELLYSEERR_API_KEY

  if (!embyUrl || !embyApiKey) {
    console.error('❌ Erreur: EMBY_URL et EMBY_API_KEY doivent être définis dans le .env pour le seed.')
    return
  }

  const defaultInstance = await prisma.instance.create({
    data: {
      name: 'Tsukyflix',
      slug: 'main',
      embyUrl: embyUrl,
      embyApiKey: embyApiKey,
      jellyseerrUrl: jellyseerrUrl,
      jellyseerrApiKey: jellyseerrApiKey,
      isDefault: true,
    }
  })

  console.log('✅ Instance par défaut créée:', defaultInstance.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
