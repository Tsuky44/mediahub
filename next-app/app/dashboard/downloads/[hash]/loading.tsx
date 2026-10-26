import { PageHeaderSkeleton, TabsSkeleton, CardGridSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={3} />
      <TabsSkeleton count={4} />
      <CardGridSkeleton count={2} className="md:grid-cols-1 xl:grid-cols-1" />
    </div>
  )
}
