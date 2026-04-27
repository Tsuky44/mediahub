'use client'

import { useEffect, useRef, useState } from 'react'

const isDev = process.env.NODE_ENV === 'development'
const logError = (...args: any[]) => { if (isDev) console.error(...args) }

export interface SystemMessageBanner {
    content: string
    speed: number
}

export interface UseSystemMessageBannerResult {
    message: SystemMessageBanner | null
    mounted: boolean
    isScrollable: boolean
    bannerRef: React.RefObject<HTMLDivElement | null>
    textMeasureRef: React.RefObject<HTMLSpanElement | null>
}

/**
 * Charge le message banner systeme et detecte si son contenu doit defiler
 * (marquee) en comparant la largeur du texte au container.
 */
export function useSystemMessageBanner(): UseSystemMessageBannerResult {
    const [message, setMessage] = useState<SystemMessageBanner | null>(null)
    const [mounted, setMounted] = useState(false)
    const [isScrollable, setIsScrollable] = useState(false)
    const bannerRef = useRef<HTMLDivElement>(null)
    const textMeasureRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        setMounted(true)
        fetch('/api/user/system-message?type=banner')
            .then(res => res.json())
            .then(data => {
                if (data.show) {
                    setMessage({ content: data.content, speed: data.speed || 20 })
                }
            })
            .catch(err => logError('Failed to fetch system message', err))
    }, [])

    useEffect(() => {
        const checkScroll = () => {
            if (bannerRef.current && textMeasureRef.current) {
                setIsScrollable(textMeasureRef.current.offsetWidth > bannerRef.current.clientWidth)
            }
        }
        checkScroll()
        const timer = setTimeout(checkScroll, 100)
        window.addEventListener('resize', checkScroll)
        return () => {
            window.removeEventListener('resize', checkScroll)
            clearTimeout(timer)
        }
    }, [message, mounted])

    return { message, mounted, isScrollable, bannerRef, textMeasureRef }
}
