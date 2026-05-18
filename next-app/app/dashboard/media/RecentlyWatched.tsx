'use client'

import { Clock, Play } from 'lucide-react'

export interface RecentlyWatchedItem {
    id: string
    tmdbId?: string
    title: string
    name: string
    seriesName?: string
    poster_path: string | null
    media_type: string
    type: string
    overview: string
    lastPlayedDate: string | null
    parentIndexNumber?: number
    indexNumber?: number
}

export function RecentlyWatched({ items }: { items: RecentlyWatchedItem[] }) {
    if (!Array.isArray(items) || items.length === 0) return null

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                Regardé récemment
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
                {items.map((item) => (
                    <a 
                        key={item.id}
                        href={`/dashboard/media/${item.tmdbId || item.id}?type=${item.type === 'Movie' ? 'movie' : 'tv'}`}
                        className="group relative flex flex-col bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-indigo-500/50 transition-all"
                    >
                        <div className="aspect-[2/3] relative overflow-hidden bg-gray-900">
                            {item.poster_path ? (
                                <img 
                                    src={item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w500${item.poster_path}`}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    No Image
                                </div>
                            )}
                        </div>
                        
                        <div className="p-3 space-y-1">
                            <h4 className="font-medium text-white truncate text-sm">
                                {item.type === 'Episode' ? item.seriesName : item.title}
                            </h4>
                            {item.type === 'Episode' && (
                                <p className="text-xs text-indigo-400 font-medium">
                                    S{item.parentIndexNumber} • E{item.indexNumber}
                                    <span className="text-gray-500 ml-2 font-normal truncate">
                                        {item.title}
                                    </span>
                                </p>
                            )}
                            <p className="text-xs text-gray-400">
                                {item.lastPlayedDate || 'Récemment'}
                            </p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    )
}
