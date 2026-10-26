import { PageHeaderSkeleton, ListSkeleton } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeaderSkeleton />
      <ListSkeleton count={8} />
    </div>
  )
}
