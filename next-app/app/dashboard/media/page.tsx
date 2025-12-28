import { embyService } from '@/lib/services/emby'
import { MediaTabs } from '@/components/MediaTabs'

export const dynamic = 'force-dynamic'

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: query } = await searchParams
  let movies: any[] = []
  let series: any[] = []
  
  try {
    const users = await embyService.getUsers()
    if (users.length > 0) {
        const userId = users[0].Id
        const embyBaseUrl = (process.env.EMBY_URL || '').split('/web/')[0].replace(/\/$/, '')

        const mapItem = (item: any) => ({
            id: item.Id,
            title: item.Name,
            name: item.Name,
            poster_path: item.ImageTags?.Primary ? `/api/media/image/${item.Id}?type=Primary&maxHeight=400&maxWidth=267&quality=90` : null,
            media_type: item.Type === 'Movie' ? 'movie' : 'tv',
            overview: item.Overview,
            emby_id: item.Id,
            tmdbId: item.ProviderIds?.Tmdb
        })

        if (query) {
            const data = await embyService.getUserItems(userId, {
                SearchTerm: query,
                Limit: 50,
                Recursive: true,
                IncludeItemTypes: 'Movie,Series',
                Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds'
            })
            const allResults = data.Items || []
            movies = allResults.filter((i: any) => i.Type === 'Movie').map(mapItem)
            series = allResults.filter((i: any) => i.Type === 'Series').map(mapItem)
        } else {
            // Fetch separately to ensure we have content for both sections
            // Increased limit to 5000 to cover most libraries. 
            // For very large libraries, we would need pagination, but this should suffice for now.
            const [moviesData, seriesData] = await Promise.all([
                embyService.getUserItems(userId, {
                    Limit: 5000,
                    SortBy: 'SortName',
                    SortOrder: 'Ascending',
                    IncludeItemTypes: 'Movie',
                    Recursive: true,
                    Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds'
                }),
                embyService.getUserItems(userId, {
                    Limit: 5000,
                    SortBy: 'SortName',
                    SortOrder: 'Ascending',
                    IncludeItemTypes: 'Series',
                    Recursive: true,
                    Fields: 'Overview,PrimaryImageAspectRatio,ProviderIds'
                })
            ])
            
            movies = (moviesData.Items || []).map(mapItem)
            series = (seriesData.Items || []).map(mapItem)
        }
    }

  } catch (e) {
      console.error('Failed to fetch media', e)
  }

  return (
      <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Ma médiathèque (Emby)</h2>
          </div>
          
          <MediaTabs movies={movies} series={series} />
      </div>
  )
}
