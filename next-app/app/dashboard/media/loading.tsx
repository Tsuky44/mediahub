import { PageHeaderSkeleton, TabsSkeleton, PosterGridSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton withSearch />
      <TabsSkeleton count={3} />
      <PosterGridSkeleton count={18} />
    </div>
  )
}
