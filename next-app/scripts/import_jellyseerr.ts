import { PrismaClient } from '@prisma/client'
import { importJellyseerrRequests } from '../lib/jellyseerr-import'
import { getTmdbService } from '../lib/services/tmdb'

const prisma = new PrismaClient()

async function main() {
  console.log(`[Script] Starting clean import`)
  
  // 1. Delete existing requests
  console.log('[Script] Deleting existing requests...')
  const deleted = await prisma.mediaRequest.deleteMany({})
  console.log(`[Script] Deleted ${deleted.count} requests.`)
  
  // 2. Import from Jellyseerr
  console.log('[Script] Importing from Jellyseerr...')
  const result = await importJellyseerrRequests(prisma)
  console.log(`[Script] Imported ${result.imported} requests.`)
  
  // 3. Fix titles
  console.log('[Script] Fixing missing titles via TMDB...')
  const tmdb = await getTmdbService()
  if (!tmdb) {
    console.error('[Script] TMDB service not available')
  } else {
    const requests = await prisma.mediaRequest.findMany({})
    
    let fixed = 0
    for (const req of requests) {
      // Check for generic titles
      const isMissing = !req.title || 
                       req.title === 'Unknown Movie' || 
                       req.title === 'Unknown Show' || 
                       req.title === '' ||
                       req.title.toLowerCase().includes('unknown')
      
      if (isMissing && req.tmdbId) {
        const type = req.mediaType === 'movie' ? 'movie' : 'tv'
        console.log(`[Script] Fetching title for ${type} ${req.tmdbId}...`)
        
        try {
          const details = await tmdb.getDetails(parseInt(req.tmdbId), type)
          if (details) {
            const title = type === 'movie' ? details.title : details.name
            if (title) {
              await prisma.mediaRequest.update({
                where: { id: req.id },
                data: { title }
              })
              console.log(`[Script]   -> Fixed: ${title}`)
              fixed++
            }
          } else {
            console.warn(`[Script]   -> Could not find details for ${type} ${req.tmdbId}`)
          }
        } catch (err: any) {
          console.error(`[Script]   -> Error fetching ${type} ${req.tmdbId}: ${err.message}`)
        }
      }
    }
    console.log(`[Script] Fixed ${fixed} titles.`)
  }
  
  console.log('[Script] All operations completed successfully.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
