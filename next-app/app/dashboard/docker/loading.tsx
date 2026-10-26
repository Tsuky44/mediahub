import { PageHeaderSkeleton, TabsSkeleton, CardGridSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withSearch />
      <TabsSkeleton count={3} />
      <CardGridSkeleton count={9} />
    </div>
  )
}
