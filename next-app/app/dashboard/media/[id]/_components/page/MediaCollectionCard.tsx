import Link from 'next/link'

interface MediaCollection {
  id: number
  name: string
  backdrop_path?: string | null
}

interface MediaCollectionCardProps {
  collection: MediaCollection
}

export default function MediaCollectionCard({
  collection,
}: MediaCollectionCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-xl border border-white/5 bg-gray-900/20">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition"
        style={{
          backgroundImage: `url(https://image.tmdb.org/t/p/w500${collection.backdrop_path})`,
        }}
      ></div>
      <div className="relative p-4 flex items-center justify-between">
        <span className="text-white font-medium text-sm">
          {collection.name}
        </span>
        <Link
          href={`/dashboard/media/collection/${collection.id}`}
          className="px-3 py-1 bg-gray-800/80 rounded text-[10px] text-gray-300 hover:text-white transition"
        >
          Voir
        </Link>
      </div>
    </div>
  )
}
