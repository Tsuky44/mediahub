
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Verifying WatchEvent schema...')

  try {
    // Create a dummy user if needed, or find one
    let user = await prisma.user.findFirst()
    if (!user) {
        console.log('No user found, creating dummy user')
        user = await prisma.user.create({
            data: {
                name: 'Test User',
                email: 'test@example.com',
                password: 'password',
                embyUserId: 'test-emby-id'
            }
        })
    }

    console.log('Creating WatchEvent with new fields...')
    const event = await prisma.watchEvent.create({
      data: {
        embyUserId: user.embyUserId || 'test-emby-id',
        userId: user.id,
        itemId: 'test-item-' + Date.now(),
        itemName: 'Test Item',
        durationMinutes: 10,
        playedAt: new Date(),
        tmdbId: '12345',
        seasonNumber: 1,
        episodeNumber: 1,
        itemType: 'Episode'
      }
    })

    console.log('WatchEvent created successfully:', event)

    if (event.tmdbId === '12345' && event.seasonNumber === 1 && event.episodeNumber === 1) {
        console.log('SUCCESS: New fields are correctly saved and returned.')
    } else {
        console.error('FAILURE: New fields are missing or incorrect.', event)
    }

    // Clean up
    await prisma.watchEvent.delete({
        where: { id: event.id }
    })
    console.log('Cleaned up test event.')

  } catch (e) {
    console.error('Error verifying schema:', e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
