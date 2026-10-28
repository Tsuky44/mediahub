import { PageHeaderSkeleton, TabsSkeleton, ListSkeleton, CardGridSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withSearch />
      <CardGridSkeleton count={4} className="md:grid-cols-2 xl:grid-cols-4 [&>*]:h-24" />
      <TabsSkeleton count={5} />
      <ListSkeleton count={8} withThumb={false} />
    </div>
  )
}
