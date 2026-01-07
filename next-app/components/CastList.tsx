'use client'

import Image from 'next/image'
import Link from 'next/link'

interface CastMember {
    id: number
    name: string
    character: string
    profile_path: string | null
}

interface CastListProps {
    cast: CastMember[]
}

export function CastList({ cast }: CastListProps) {
    if (!cast || cast.length === 0) return null

    return (
        <div className="mt-12">
            <h3 className="text-xl font-bold text-white mb-4">Têtes d'affiche</h3>
            <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {cast.map((actor) => (
                    <Link 
                        key={actor.id} 
                        href={`/dashboard/person/${actor.id}`}
                        className="flex-shrink-0 w-36 bg-gray-800/40 hover:bg-gray-800/80 rounded-lg overflow-hidden shadow-lg border border-white/5 hover:border-indigo-500/50 transition-all duration-300 group"
                    >
                        <div className="relative aspect-[2/3] w-full bg-gray-900 overflow-hidden">
                            {actor.profile_path ? (
                                <img
                                    src={`https://image.tmdb.org/t/p/w300${actor.profile_path}`}
                                    alt={actor.name}
                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-600 bg-gray-800">
                                    <span className="text-xs italic">Pas d'image</span>
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            <h4 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-indigo-400 transition-colors" title={actor.name}>{actor.name}</h4>
                            <p className="text-[11px] text-gray-400 mt-1 line-clamp-1" title={actor.character}>{actor.character}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
