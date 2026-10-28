import { PageHeaderSkeleton, PosterGridSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <PosterGridSkeleton count={18} />
    </div>
  )
}
