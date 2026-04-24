'use client'

import { useEffect, useState } from 'react'

interface MediaPosterProps {
    src: string | null
    alt: string
    fallbackSrc?: string | null
    placeholder: React.ReactNode
}

/**
 * Affiche un poster de media avec un fallback automatique si l'image
 * principale echoue (ex: TMDB -> proxy interne).
 */
export function MediaPoster({ src, alt, fallbackSrc, placeholder }: MediaPosterProps) {
    const [errored, setErrored] = useState(false)
    const [usingFallback, setUsingFallback] = useState(false)
    const [imgSrc, setImgSrc] = useState<string | null>(src)

    useEffect(() => {
        setImgSrc(src)
        setErrored(false)
        setUsingFallback(false)
    }, [src])

    const handleError = () => {
        if (!usingFallback && fallbackSrc && fallbackSrc !== src) {
            setUsingFallback(true)
            setImgSrc(fallbackSrc)
        } else {
            setErrored(true)
        }
    }

    if (!imgSrc || errored) {
        return <>{placeholder}</>
    }

    return (
        <img
            src={imgSrc}
            alt={alt}
            onError={handleError}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
        />
    )
}
