'use client'

import { useState } from 'react'
import { PlayCircle, X } from 'lucide-react'

interface TrailerButtonProps {
    youtubeId: string
    title: string
}

export function TrailerButton({ youtubeId, title }: TrailerButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (!youtubeId) return null

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-6 py-3 text-sm font-semibold text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)] transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] backdrop-blur-md group"
            >
                <PlayCircle className="h-4 w-4 fill-red-500/20 group-hover:fill-red-500/40 transition-colors" />
                <span>Bande-annonce</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
                        onClick={() => setIsOpen(false)}
                    />
                    
                    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                        
                        <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                            title={`Trailer for ${title}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                        />
                    </div>
                </div>
            )}
        </>
    )
}
