'use client'

import { useEffect } from 'react'

const HIGHLIGHT_DELAY_MS = 100
const HIGHLIGHT_DURATION_MS = 3000
const HIGHLIGHT_CLASSES = ['bg-indigo-500/10', 'ring-1', 'ring-indigo-500/50']

/**
 * Scroll vers un episode et applique un effet de highlight temporaire
 * une fois que la liste d'episodes est chargee.
 */
export function useEpisodeHighlight(loaded: boolean, highlightEpisode: number | null | undefined) {
    useEffect(() => {
        if (!loaded || !highlightEpisode) return

        const timer = setTimeout(() => {
            const el = document.getElementById(`episode-${highlightEpisode}`)
            if (!el) return
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.classList.add(...HIGHLIGHT_CLASSES)
            setTimeout(() => el.classList.remove(...HIGHLIGHT_CLASSES), HIGHLIGHT_DURATION_MS)
        }, HIGHLIGHT_DELAY_MS)

        return () => clearTimeout(timer)
    }, [loaded, highlightEpisode])
}
