import { PageHeaderSkeleton, TabsSkeleton, ListSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton withSearch />
      <TabsSkeleton count={5} />
      <ListSkeleton count={8} />
    </div>
  )
}
