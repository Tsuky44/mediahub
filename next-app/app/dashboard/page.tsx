import { embyService } from '@/lib/services/emby'
import { DashboardStats } from '@/components/DashboardStats'

// Force dynamic because we are fetching real-time stats
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  let stats = {}
  try {
    stats = await embyService.getServerStats()
  } catch (e) {
    console.error('Failed to fetch stats', e)
    // Fallback stats or error state
    stats = {
        overview: { totalHours: 0, activeUsers: 0, totalPlays: 0 },
        top: { movies: [], series: [] }
    }
  }

  return <DashboardStats stats={stats} />
}
