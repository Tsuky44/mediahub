import { RecentlyWatched } from '../media/RecentlyWatched'
import { Recommendations } from '../media/Recommendations'
import { RecentRequests } from './RecentRequests'
import { loadRecentlyWatched, loadRecommendations, loadRecentRequests } from '../_services/fetch-dashboard-data'
import { ListSkeleton, PosterGridSkeleton, PosterRowSkeleton, SkeletonBlock } from '@/components/ui/skeletons'

// Sections asynchrones du dashboard (Server Components), rendues dans des <Suspense>.
// Une erreur d'un service externe n'affecte que sa section (équivalent de l'ancien Promise.allSettled).

async function settle<T>(loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader()
  } catch {
    return []
  }
}

export async function RecentlyWatchedSection() {
  return <RecentlyWatched items={await settle(loadRecentlyWatched)} />
}

export async function RecommendationsSection() {
  return <Recommendations items={await settle(loadRecommendations)} />
}

export async function RecentRequestsSection() {
  return <RecentRequests requests={await settle(loadRecentRequests)} />
}

// --- Squelettes affichés pendant le streaming ------------------------------

export function RecentlyWatchedSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-6 w-48" />
      <PosterGridSkeleton count={4} />
    </div>
  )
}

export function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-6 w-56" />
      <PosterRowSkeleton />
    </div>
  )
}

export function RecentRequestsSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SkeletonBlock className="h-9 w-52 mb-4" />
      <ListSkeleton />
    </div>
  )
}
