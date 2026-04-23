'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MediaCard } from './MediaCard'
import Link from 'next/link'

interface MediaSliderProps {
    title: string
    items: any[]
    mediaType?: 'movie' | 'tv'
    viewAllLink?: string
}

export function MediaSlider({ title, items, mediaType, viewAllLink }: MediaSliderProps) {
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
