
import { PrismaClient } from '@prisma/client'
import { getSetting } from '../lib/settings'
const prisma = new PrismaClient()

async function main() {
  try {
    const count = await prisma.user.count()
    console.log('User count:', count)
    const instances = await (prisma as any).instance.findMany()
    console.log('Instances configuration:')
    for (const i of instances) {
      console.log(`- ${i.name} (${i.slug}):`)
      console.log(`  Emby URL: ${i.embyUrl || 'MISSING'}`)
      console.log(`  Emby API Key: ${i.embyApiKey ? 'OK' : 'MISSING'}`)
      console.log(`  Jellyseerr URL: ${i.jellyseerrUrl || 'MISSING'}`)
      
      const tmdbKey = await getSetting('tmdb_api_key', i.id)
      console.log(`  TMDB API Key: ${tmdbKey ? 'OK' : 'MISSING'}`)
    }
  } catch (e) {
    console.error('Prisma check failed:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
