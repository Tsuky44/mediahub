'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SeasonEpisodes } from './SeasonEpisodes'
import type { Season, SeasonProgress } from '../../_types/season'

interface SeasonEpisodesPanelProps {
    id: string
    open: number | null
    seasons: Season[]
    /** Abscisse (ecran) du centre final de la bulle d'une saison : la lumiere du panneau s'y cale */
    anchor: (seasonNumber: number) => number | null
    /** Rangee des bulles (defilante sur telephone) */
    rail: React.RefObject<HTMLDivElement | null>
    statuses: Record<number, string>
    progress: SeasonProgress[]
    canTriggerSearch?: boolean
    canInteractiveSearch?: boolean
    canRequest?: boolean
    onRequested: (seasonNumber: number) => void
    tvId: number
    tvdbId?: number
    title: string
    highlightSeason: number | null
    highlightEpisode: number | null
}

/** Saison affichee, celle qui s'en va et le sens du changement */
interface View {
    open: number | null
    season: number | null
    previous: number | null
    dir: number
}

/** Duree de sortie des episodes de la saison quittee */
const LEAVE_MS = 320
/** Duree du repli du panneau (transition de hauteur) */
const CLOSE_MS = 560

/**
 * Panneau des episodes, sous les bulles. Il se deplie a l'ouverture et suit en douceur la hauteur
 * de son contenu ; d'une saison a l'autre, l'ancienne liste file d'un cote pendant que la nouvelle
 * arrive de l'autre. Une lumiere glisse en haut du panneau jusque sous la bulle choisie.
 * Hauteur et lumiere sont posees directement sur le DOM : aucun rendu React pendant l'animation.
 */
export function SeasonEpisodesPanel({
    id,
    open,
    seasons,
    anchor,
    rail,
    statuses,
    progress,
    canTriggerSearch,
    canInteractiveSearch,
    canRequest,
    onRequested,
    tvId,
    tvdbId,
    title,
    highlightSeason,
    highlightEpisode,
}: SeasonEpisodesPanelProps) {
    const [view, setView] = useState<View>({ open, season: open, previous: null, dir: 0 })
    if (view.open !== open) {
        if (open === null) setView({ ...view, open })
        else if (view.season === null || view.season === open) setView({ open, season: open, previous: view.previous, dir: 0 })
        else setView({ open, season: open, previous: view.season, dir: open > view.season ? 1 : -1 })
    }

    const frame = useRef<HTMLDivElement>(null)
    const body = useRef<HTMLDivElement>(null)
    const beam = useRef<HTMLDivElement>(null)

    // La saison quittee disparait une fois sortie
    useEffect(() => {
        if (view.previous === null) return
        const timer = window.setTimeout(() => setView(v => ({ ...v, previous: null })), LEAVE_MS)
        return () => window.clearTimeout(timer)
    }, [view.previous, view.season])

    // Panneau ferme : son contenu est retire une fois replie
    useEffect(() => {
        if (open !== null || view.season === null) return
        const timer = window.setTimeout(
            () => setView(v => (v.open === null ? { ...v, season: null, previous: null } : v)),
            CLOSE_MS,
        )
        return () => window.clearTimeout(timer)
    }, [open, view.season])

    // Hauteur : de 0 a celle du contenu (et suivie quand il change), puis retour a 0
    useLayoutEffect(() => {
        const f = frame.current
        if (!f) return
        if (open === null) {
            if (!f.style.height) f.style.height = `${f.offsetHeight}px`
            void f.offsetHeight
            f.style.height = '0px'
            return
        }
        const b = body.current
        if (!b) return
        if (!f.style.height) {
            f.style.height = '0px'
            void f.offsetHeight
        }
        const fit = () => {
            f.style.height = `${b.offsetHeight}px`
        }
        fit()
        const observer = new ResizeObserver(fit)
        observer.observe(b)
        return () => observer.disconnect()
    }, [open, view.season])

    // Lumiere sous la bulle ouverte (suit aussi le defilement de la rangee sur telephone)
    useLayoutEffect(() => {
        if (open === null) return
        const row = rail.current
        const place = () => {
            const x = anchor(open)
            const f = frame.current
            const b = beam.current
            if (x === null || !f || !b) return
            b.style.translate = `${x - f.getBoundingClientRect().left}px 0`
        }
        place()
        const observer = new ResizeObserver(place)
        if (row) {
            observer.observe(row)
            row.addEventListener('scroll', place, { passive: true })
        }
        return () => {
            observer.disconnect()
            row?.removeEventListener('scroll', place)
        }
    }, [open, anchor, rail])

    const shown = seasons.find(s => s.season_number === view.season)
    const previous = view.previous === null ? undefined : seasons.find(s => s.season_number === view.previous)
    const layer = { tvId, tvdbId, title, allSeasons: seasons, canTriggerSearch, canInteractiveSearch, canRequest, onRequested, dir: view.dir }

    return (
        <div
            ref={frame}
            id={id}
            role="region"
            aria-label={shown ? `Épisodes : ${shown.name}` : 'Épisodes'}
            className="relative overflow-hidden transition-[height] duration-[560ms] ease-out-onyx motion-reduce:transition-none"
        >
            {shown && (
                <div ref={body} className="pt-4">
                    <div
                        className={cn(
                            'relative rounded-3xl border border-white/[0.07] bg-white/[0.02] p-3 shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] transition-opacity duration-500 sm:p-4',
                            open === null && 'opacity-0',
                        )}
                    >
                        <div
                            ref={beam}
                            aria-hidden
                            className="pointer-events-none absolute left-0 top-0 transition-[translate] duration-700 ease-out-onyx motion-reduce:transition-none"
                        >
                            <div key={open ?? 'off'} className="onyx-season-flare relative">
                                <span className="absolute left-0 top-0 h-28 w-80 -translate-x-1/2 bg-[radial-gradient(50%_60%_at_50%_0%,rgb(242_240_237/0.13),transparent)]" />
                                <span className="absolute left-0 -top-px h-px w-44 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent shadow-[0_0_14px_rgb(242_240_237/0.6)]" />
                            </div>
                        </div>

                        {/* Meme cle d'un role a l'autre : la saison quittee garde sa liste, sans la rejouer */}
                        {[previous, shown].map(season =>
                            season && (season !== previous || season.season_number !== shown.season_number) ? (
                                <SeasonEpisodes
                                    key={season.season_number}
                                    {...layer}
                                    season={season}
                                    status={statuses[season.season_number] ?? 'unknown'}
                                    progress={progress.find(p => p.seasonNumber === season.season_number)}
                                    leaving={season === previous}
                                    highlightEpisode={season === shown && season.season_number === highlightSeason ? highlightEpisode : null}
                                    className={season === previous ? 'absolute inset-x-3 top-3 sm:inset-x-4 sm:top-4' : undefined}
                                />
                            ) : null,
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
