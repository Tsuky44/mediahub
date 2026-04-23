import { MediaCard } from './MediaCard'

interface MediaGridProps {
  items: any[]
}

export function MediaGrid({ items }: MediaGridProps) {
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} showFavoriteButton={true} />
      ))}
    </div>
  )
}
