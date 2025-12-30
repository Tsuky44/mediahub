import { embyService } from '@/lib/services/emby'
import { DashboardStats } from '@/components/DashboardStats'
import { fetchRecentlyWatchedItems, fetchUserRecommendations } from './media/actions'
import { RecentlyWatched } from './media/RecentlyWatched'
import { Recommendations } from './media/Recommendations'

// Force dynamic because we are fetching real-time stats
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let stats = {}
  let recentlyWatched: any[] = []
  let recommendations: any[] = []

  try {
    const [statsResult, watchedResult, recsResult] = await Promise.all([
      embyService.getServerStats(),
      fetchRecentlyWatchedItems(),
      fetchUserRecommendations()
    ])
    stats = statsResult
    recentlyWatched = watchedResult
    recommendations = recsResult
  } catch (e) {
    console.error('Failed to fetch dashboard data', e)
    stats = {
        overview: { totalHours: 0, activeUsers: 0, totalPlays: 0 },
        top: { movies: [], series: [] }
    }
  }

  return (
    <div className="space-y-8">
      <DashboardStats stats={stats} />
      
      <div className="grid grid-cols-1 gap-8">
        {recentlyWatched.length > 0 && (
          <RecentlyWatched items={recentlyWatched} />
        )}
        
        {recommendations.length > 0 && (
          <Recommendations items={recommendations} />
        )}
      </div>
    </div>
  )
}
