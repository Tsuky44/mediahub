'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { MediaCard } from '@/components/MediaCard'

interface RecommendationItem {
    id: number
    title?: string
    name?: string
    poster_path: string | null
    media_type: string
    vote_average: number
    release_date?: string
    first_air_date?: string
}

export function Recommendations({ items, showTitle = true }: { items: RecommendationItem[], showTitle?: boolean }) {
    if (!items || items.length === 0) return null

    return (
        <div className="space-y-4">
            {showTitle && (
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Recommandations pour vous
                </h3>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {items.map((item) => (
                    <MediaCard 
                        key={`${item.media_type}-${item.id}`}
                        item={{
                            ...item,
                            id: item.id.toString(),
                            tmdbId: item.id
                        }} 
                    />
                ))}
            </div>
        </div>
    )
}
