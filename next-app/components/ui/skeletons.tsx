import { cn } from '@/lib/utils'

// Squelettes partagés (Server Components, zéro JS client) utilisés par les
// loading.tsx et les fallbacks <Suspense> : l'écran réagit instantanément à
// chaque navigation pendant que le serveur streame la page.

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-800/50 border border-gray-700/30', className)} />
}

export function PageHeaderSkeleton({ withSearch = false }: { withSearch?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-4 w-72 border-0" />
      </div>
      {withSearch && <SkeletonBlock className="h-11 w-full sm:w-80 rounded-full" />}
    </div>
  )
}

export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className="h-9 w-28 flex-shrink-0" />
      ))}
    </div>
  )
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className="aspect-[2/3] rounded-xl" />
      ))}
    </div>
  )
}

export function PosterRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden pb-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className="flex-shrink-0 w-[150px] sm:w-[180px] aspect-[2/3] rounded-xl" />
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 6, withThumb = true }: { count?: number; withThumb?: boolean }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/40 border border-gray-800/50">
          {withThumb && <SkeletonBlock className="h-16 w-11 flex-shrink-0 border-0" />}
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-3/4 border-0" />
            <SkeletonBlock className="h-3 w-1/2 border-0" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3', className)}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  )
}

export function MediaDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/40 p-6 md:p-10">
        <div className="flex flex-col md:flex-row gap-8">
          <SkeletonBlock className="w-48 md:w-64 aspect-[2/3] rounded-xl flex-shrink-0 mx-auto md:mx-0" />
          <div className="flex-1 space-y-4">
            <SkeletonBlock className="h-10 w-2/3" />
            <SkeletonBlock className="h-4 w-1/3 border-0" />
            <div className="flex gap-2">
              {Array.from({ length: 3 }, (_, i) => (
                <SkeletonBlock key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
            <div className="space-y-2 pt-2">
              <SkeletonBlock className="h-4 w-full border-0" />
              <SkeletonBlock className="h-4 w-11/12 border-0" />
              <SkeletonBlock className="h-4 w-4/5 border-0" />
            </div>
            <div className="flex gap-3 pt-4">
              <SkeletonBlock className="h-11 w-40 rounded-xl" />
              <SkeletonBlock className="h-11 w-11 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
      <SkeletonBlock className="h-6 w-40" />
      <PosterRowSkeleton count={7} />
    </div>
  )
}
