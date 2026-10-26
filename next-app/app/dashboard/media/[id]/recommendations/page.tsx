import { getTmdbServiceForUser } from '@/lib/auth'
import { MediaCard } from '@/components/global/MediaCard'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { defineAbilityFor } from '@/lib/ability'

export const dynamic = 'force-dynamic'

export default async function RecommendationsPage({ 
    params, 
    searchParams 
}: { 
    params: Promise<{ id: string }>, 
    searchParams: Promise<{ type?: string }> 
}) {
    const session = await getSession()
    if (!session) redirect('/api/auth/signin')

    const ability = defineAbilityFor(session.user)
    if (ability.cannot('read', 'Media') && ability.cannot('read', 'Library')) {
        redirect('/dashboard')
    }

    const { id } = await params
    const { type } = await searchParams
    const mediaType = (type as 'movie' | 'tv') || 'movie'
    const tmdbId = parseInt(id)

    if (isNaN(tmdbId)) notFound()

    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) notFound()

    // Fetch original details to get the title
    const details = await tmdbService.getDetails(tmdbId, mediaType)
    if (!details) notFound()

    // Fetch recommendations (get first 2 pages for a good amount)
    const [page1, page2] = await Promise.all([
        tmdbService.getRecommendations(tmdbId, mediaType, 1),
        tmdbService.getRecommendations(tmdbId, mediaType, 2)
    ])

    const recommendations = [
        ...(page1?.results || []),
        ...(page2?.results || [])
    ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // Deduplicate just in case

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link 
                    href={`/dashboard/media/${id}?type=${mediaType}`}
                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Recommandations</h1>
                    <p className="text-gray-400">Basé sur {details.title || details.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {recommendations.map((item: any) => (
                    <MediaCard 
                        key={item.id} 
                        item={{
                            ...item,
                            media_type: item.media_type || mediaType
                        }} 
                    />
                ))}
            </div>
            
            {recommendations.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    Aucune recommandation trouvée.
                </div>
            )}
        </div>
    )
}
