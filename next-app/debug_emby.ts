
import { embyService } from './lib/services/emby'
import { prisma } from './lib/prisma'

async function main() {
    console.log('Fetching users...')
    const users = await embyService.getUsers()
    if (users.length === 0) {
        console.log('No users found')
        return
    }

    const userId = users[0].Id
    console.log('Using user:', users[0].Name, userId)

    // Try to find a series by TMDB ID
    // The Witcher TMDB ID is 71912
    const tmdbId = 71912 
    
    console.log(`Searching for series with TMDB ID ${tmdbId}...`)
    const item = await embyService.getItemByTmdbId(userId, tmdbId, 'Series')
    
    if (item) {
        console.log('Found item:', item.Name, item.Id)
        console.log('UserData:', JSON.stringify(item.UserData, null, 2))
        
        console.log('Fetching episodes for season 1...')
        const episodes = await embyService.getEpisodes(userId, item.Id, 1)
        console.log(`Found ${episodes.length} episodes`)
        if (episodes.length > 0) {
            console.log('First episode:', episodes[0].Name, episodes[0].IndexNumber)
            console.log('First episode UserData:', JSON.stringify(episodes[0].UserData, null, 2))
        }
    } else {
        console.log('Item not found via TMDB ID')
        
        // Try to list some items to see if they have ProviderIds
        const items = await embyService.getUserItems(userId, {
            IncludeItemTypes: 'Series',
            Limit: 5,
            Fields: 'ProviderIds'
        })
        console.log('Sample items:', JSON.stringify(items.Items.map((i: any) => ({ name: i.Name, providers: i.ProviderIds })), null, 2))
    }
}

main().catch(console.error)
