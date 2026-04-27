'use client'

import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { Info } from 'lucide-react'
import { useSystemMessageBanner } from '../_hooks/useSystemMessageBanner'

/** Banner systeme defilant en haut de la page de login (marquee si trop long). */
export function SystemMessageBanner() {
    const { message, mounted, isScrollable, bannerRef, textMeasureRef } = useSystemMessageBanner()

    if (!message || !mounted) return null

    return createPortal(
        <>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    display: inline-block;
                    animation: marquee ${message.speed}s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
            <div className="fixed top-0 left-0 w-full z-[100] bg-indigo-600/95 backdrop-blur-md border-b border-white/10 shadow-2xl animate-in slide-in-from-top duration-500">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 overflow-hidden h-12">
                    <Info className="text-white shrink-0 z-10" size={20} />
                    <div ref={bannerRef} className="flex-1 overflow-hidden relative h-full flex items-center">
                        <div
                            className={clsx(
                                'whitespace-nowrap transition-all duration-300',
                                isScrollable ? 'animate-marquee pl-[100%]' : 'w-full text-center flex justify-center',
                            )}
                        >
                            <span ref={textMeasureRef} className="text-sm font-medium text-white leading-tight inline-block">
                                {message.content}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    )
}
