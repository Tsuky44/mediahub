'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MediaCard } from './MediaCard'

interface MediaSliderProps {
    title: string
    items: any[]
    mediaType?: 'movie' | 'tv'
}

export function MediaSlider({ title, items, mediaType }: MediaSliderProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    if (!items || items.length === 0) return null

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current
            const scrollTo = direction === 'left' 
                ? scrollLeft - clientWidth * 0.8 
                : scrollLeft + clientWidth * 0.8
            
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {title}
                    <button className="text-gray-500 hover:text-white transition">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => scroll('left')}
                        className="p-2 rounded-full bg-gray-800/50 border border-gray-700 hover:bg-gray-700 text-white transition"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => scroll('right')}
                        className="p-2 rounded-full bg-gray-800/50 border border-gray-700 hover:bg-gray-700 text-white transition"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide scroll-smooth no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
