'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { MediaCard, MediaItem } from './MediaCard'

type MediaListVariant = 'grid' | 'slider'

interface MediaListProps {
    items: MediaItem[]
    variant?: MediaListVariant
    // Grid-specific
    showFavoriteButton?: boolean
    // Slider-specific
    title?: string
    mediaType?: 'movie' | 'tv'
    viewAllLink?: string
}

export function MediaList({
    items,
    variant = 'grid',
    showFavoriteButton = false,
    title,
    mediaType,
    viewAllLink,
}: MediaListProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    if (!items || items.length === 0) return null

    if (variant === 'grid') {
        return (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {items.map((item) => (
                    <MediaCard
                        key={item.id}
                        item={item}
                        showFavoriteButton={showFavoriteButton}
                    />
                ))}
            </div>
        )
    }

    // Slider variant
    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {viewAllLink ? (
                        <Link href={viewAllLink} className="group flex items-center gap-2 w-fit">
                            <h2 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                {title}
                            </h2>
                            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all translate-y-[1px]" />
                        </Link>
                    ) : (
                        <h2 className="text-2xl font-bold text-white">
                            {title}
                        </h2>
                    )}
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-4 pb-4 scroll-smooth"
            >
                {items.map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-[180px] sm:w-[200px]">
                        <MediaCard
                            item={{
                                ...item,
                                media_type: item.media_type || mediaType
                            }}
                        />
                    </div>
                ))}
            </div>
        </section>
    )
}
