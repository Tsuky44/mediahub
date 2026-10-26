import { PageHeaderSkeleton, PosterGridSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-8 max-w-[1600px] mx-auto px-4 py-6">
      <PageHeaderSkeleton withSearch />
      <PosterGridSkeleton count={18} />
    </div>
  )
}
