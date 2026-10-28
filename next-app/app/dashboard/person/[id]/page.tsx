import { getTmdbServiceForUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'

interface PersonPageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PersonPageProps): Promise<Metadata> {
    const { id } = await params
    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) return { title: 'Service non disponible' }
    
    const person = await tmdbService.getPersonDetails(parseInt(id))
    if (!person) return { title: 'Artiste non trouvé' }
    return { title: `${person.name} - MediaHub` }
}

const DEPT_TRANSLATIONS: Record<string, string> = {
    "Acting": "Interprétation",
    "Directing": "Réalisation",
    "Writing": "Scénario",
    "Production": "Production",
    "Camera": "Image",
    "Editing": "Montage",
    "Art": "Direction Artistique",
    "Costume & Make-Up": "Costumes et Maquillage",
    "Sound": "Son",
    "Visual Effects": "Effets Visuels",
    "Crew": "Équipe Technique",
    "Lighting": "Lumière"
}

export default async function PersonPage({ params }: PersonPageProps) {
    const { id } = await params
    const tmdbService = await getTmdbServiceForUser()
    if (!tmdbService) {
        notFound()
    }

    const person = await tmdbService.getPersonDetails(parseInt(id))

    if (!person) {
        notFound()
    }

    // Filter and sort credits (movies and TV shows)
    const credits = person.combined_credits?.cast || []
    const sortedCredits = credits
        .filter((c: any) => c.poster_path) // Only items with posters
        .sort((a: any, b: any) => {
            const dateA = a.release_date || a.first_air_date || '0000-00-00'
            const dateB = b.release_date || b.first_air_date || '0000-00-00'
            return dateB.localeCompare(dateA)
        })

    const age = person.birthday ? Math.floor((new Date().getTime() - new Date(person.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null

    return (
        <div className="min-h-screen bg-black/40 pb-20">
            {/* Header / Background */}
            <div className="relative h-[40vh] w-full overflow-hidden">
                <div 
                    className="absolute inset-0 bg-cover bg-center opacity-30 blur-sm"
                    style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${sortedCredits[0]?.backdrop_path || ''})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080909] via-[#080909]/60 to-transparent" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar: Profile Photo & Details */}
                    <div className="w-full md:w-80 flex-shrink-0">
                        <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900">
                            {person.profile_path ? (
                                <img 
                                    src={`https://image.tmdb.org/t/p/h632${person.profile_path}`}
                                    alt={person.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 italic">Pas de photo</div>
                            )}
                        </div>

                        <div className="mt-8 space-y-6 bg-white/[0.03] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
                            <h3 className="text-white font-bold text-lg border-b border-white/10 pb-2">Informations</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase font-bold tracking-wider">Connu pour</span>
                                    <span className="text-gray-200 text-sm">{DEPT_TRANSLATIONS[person.known_for_department] || person.known_for_department}</span>
                                </div>
                                
                                {person.birthday && (
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-bold tracking-wider">Date de naissance</span>
                                        <span className="text-gray-200 text-sm">
                                            {new Date(person.birthday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            {age && !person.deathday && ` (${age} ans)`}
                                        </span>
                                    </div>
                                )}

                                {person.place_of_birth && (
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-bold tracking-wider">Lieu de naissance</span>
                                        <span className="text-gray-200 text-sm">{person.place_of_birth}</span>
                                    </div>
                                )}

                                {person.deathday && (
                                    <div>
                                        <span className="block text-gray-500 text-xs uppercase font-bold tracking-wider">Décès</span>
                                        <span className="text-gray-200 text-sm">
                                            {new Date(person.deathday).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Bio & Filmography */}
                    <div className="flex-1 space-y-12">
                        <div>
                            <h1 className="text-4xl md:text-6xl font-black text-white mb-4">{person.name}</h1>
                            {person.biography && (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-indigo-400">Biographie</h2>
                                    <p className="text-gray-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                                        {person.biography || "Aucune biographie disponible pour cet artiste."}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <h2 className="text-2xl font-bold text-white">Filmographie</h2>
                                <span className="text-gray-500 text-sm font-medium">{sortedCredits.length} titres</span>
                            </div>

                            <div className="onyx-stagger grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {sortedCredits.slice(0, 50).map((item: any) => (
                                    <Link 
                                        key={`${item.media_type}-${item.id}`} 
                                        href={`/dashboard/media/${item.id}?type=${item.media_type}`}
                                        className="group"
                                    >
                                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-white/5 bg-gray-900 group-hover:border-indigo-500/50 transition-all duration-300 shadow-lg">
                                            <img 
                                                src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                                                alt={item.title || item.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <p className="text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                                                    {item.media_type === 'movie' ? 'Film' : 'Série'}
                                                </p>
                                                <p className="text-white text-xs font-bold line-clamp-2">
                                                    {item.title || item.name}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2">
                                            <p className="text-white text-xs font-medium truncate group-hover:text-indigo-400 transition-colors">
                                                {item.title || item.name}
                                            </p>
                                            <p className="text-gray-500 text-[10px] truncate">
                                                {item.character && `rôle de ${item.character}`}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
