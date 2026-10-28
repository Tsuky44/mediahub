import { PageHeaderSkeleton, TabsSkeleton, CardGridSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <TabsSkeleton count={6} />
      <CardGridSkeleton count={4} className="xl:grid-cols-2" />
    </div>
  )
}
