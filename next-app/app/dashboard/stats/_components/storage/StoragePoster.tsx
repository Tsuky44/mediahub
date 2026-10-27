'use client'

import { useState } from 'react'
import { Film, Tv } from 'lucide-react'
import type { StorageItem } from '../../_types/storage'

type PosterItem = Pick<StorageItem, 'id' | 'type' | 'tmdbId'>

/**
 * Affiche via le proxy d'images (TMDB en priorité, sinon le serveur média).
 * `width` : largeur demandée en pixels (le proxy choisit la taille TMDB adaptée).
 */
export function storagePosterUrl(item: PosterItem, width: number): string {
    const params = new URLSearchParams({
        mediaType: item.type === 'Movie' ? 'movie' : 'tv',
        maxWidth: String(width),
    })
    if (item.tmdbId) params.set('tmdbId', String(item.tmdbId))
    return `/api/media/image/${item.id}?${params}`
}

interface StoragePosterProps {
    item: PosterItem
    width?: number
    className?: string
    iconSize?: number
}

/** Vignette d'affiche (2:3) ; l'icône du type reste visible pendant le chargement ou sans image. */
export function StoragePoster({ item, width = 92, className = 'w-10', iconSize = 16 }: StoragePosterProps) {
    const [failed, setFailed] = useState(false)
    const Icon = item.type === 'Movie' ? Film : Tv

    return (
        <div className={`relative shrink-0 aspect-[2/3] overflow-hidden rounded-md bg-white/5 ring-1 ring-white/10 ${className}`}>
            <div className={`absolute inset-0 flex items-center justify-center ${item.type === 'Movie' ? 'text-blue-400/70' : 'text-emerald-400/70'}`}>
                <Icon size={iconSize} />
            </div>
            {!failed && (
                <img
                    src={storagePosterUrl(item, width)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailed(true)}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}
        </div>
    )
}
