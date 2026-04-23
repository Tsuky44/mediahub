import { getTmdbServiceForUser, getCurrentUser } from '@/lib/auth'
import { MediaCard } from '@/components/global/MediaCard'
import { notFound, redirect } from 'next/navigation'
import { defineAbilityFor } from '@/lib/ability'

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const collectionId = parseInt(id)

  if (isNaN(collectionId)) {
    notFound()
  }

  const user = await getCurrentUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ability = defineAbilityFor(user as any)

  if (ability.cannot('read', 'Media') && ability.cannot('read', 'Library')) {
    redirect('/dashboard')
  }

  const tmdbService = await getTmdbServiceForUser()
  if (!tmdbService) {
      notFound()
  }

  const collection = await tmdbService.getCollectionDetails(collectionId)

  if (!collection) {
    notFound()
  }

  const backdropUrl = collection.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${collection.backdrop_path}` 
    : null

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Backdrop Section */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        {backdropUrl && (
          <>
            <img 
              src={backdropUrl} 
              alt={collection.name} 
              className="h-full w-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
          </>
        )}
        <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full max-w-[1600px] mx-auto right-0">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{collection.name}</h1>
          <p className="text-gray-300 max-w-3xl text-lg leading-relaxed">
            {collection.overview}
          </p>
        </div>
      </div>

      {/* Movies Grid */}
      <div className="max-w-[1600px] mx-auto px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {collection.parts.map((movie: any) => (
            <MediaCard 
              key={movie.id} 
              item={{...movie, media_type: 'movie'}} 
            />
          ))}
        </div>
      </div>
    </div>
  )
}
