'use client'

import { useState, useRef } from 'react'
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
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
    const scrollRef = useRef<HTMLDivElement>(null)
    const [showLeftArrow, setShowLeftArrow] = useState(false)
    const [showRightArrow, setShowRightArrow] = useState(true)

    if (!items || items.length === 0) return null

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
            setShowLeftArrow(scrollLeft > 10)
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { clientWidth } = scrollRef.current
            const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
        }
    }

    return (
        <div className="space-y-4 relative group/container">
            {showTitle && (
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Recommandations pour vous
                    </h3>
                </div>
            )}
            
            <div className="relative">
                {/* Flèche Gauche */}
                {showLeftArrow && (
                    <button 
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-900/80 border border-gray-700 text-white rounded-full shadow-xl opacity-0 group-hover/container:opacity-100 transition-opacity hidden sm:block hover:bg-blue-600 hover:border-blue-500"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}

                {/* Container de scroll */}
                <div 
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-1 scroll-smooth snap-x snap-mandatory"
                >
                    {items.map((item) => (
                        <div key={`${item.media_type}-${item.id}`} className="flex-shrink-0 w-[150px] sm:w-[180px] snap-start">
                            <MediaCard 
                                item={{
                                    ...item,
                                    id: item.id.toString(),
                                    tmdbId: item.id
                                }} 
                            />
                        </div>
                    ))}
                    {/* Spacer final pour permettre le peek du dernier item */}
                    <div className="flex-shrink-0 w-4 sm:hidden" />
                </div>

                {/* Flèche Droite */}
                {showRightArrow && (
                    <button 
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-gray-900/80 border border-gray-700 text-white rounded-full shadow-xl opacity-0 group-hover/container:opacity-100 transition-opacity hidden sm:block hover:bg-blue-600 hover:border-blue-500"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
    )
}
