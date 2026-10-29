'use client'

import { useDeferredValue, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SeasonBubble } from './season/SeasonBubble'
import { SeasonEpisodesPanel } from './season/SeasonEpisodesPanel'
import { DROP_SIZE, TAIL_SIZES, liquidSwitch, type RowLayout } from './season/liquid'
import { usePrefetchSeasonEpisodes } from '../_hooks/useSeasonEpisodes'
import type { Season, SeasonProgress, SeasonStatus } from '../_types/season'

export type { SeasonProgress } from '../_types/season'

interface SeasonListProps {
    tvId: number
    tvdbId?: number
    title: string
    seasons: Season[]
    seasonStatuses: SeasonStatus[]
    seasonProgress?: SeasonProgress[]
    canTriggerSearch?: boolean
    canInteractiveSearch?: boolean
    canRequest?: boolean
}

/** Elements de la rangee : bulles, corps liquides, goutte et gouttelettes */
function rowParts(row: HTMLElement) {
    return {
        chips: [...row.querySelectorAll<HTMLElement>('[data-season]')],
        bodies: [...row.querySelectorAll<HTMLElement>('[data-body]')],
        drop: row.querySelector<HTMLElement>('[data-drop]')!,
        tails: [...row.querySelectorAll<HTMLElement>('[data-tail]')],
    }
}

/** Place finale des bulles ; les corps liquides prennent leur taille */
function settle(parts: ReturnType<typeof rowParts>): RowLayout {
    const layout = { x: parts.chips.map(c => c.offsetLeft), w: parts.chips.map(c => c.offsetWidth) }
    parts.bodies.forEach((body, i) => {
        body.style.width = `${layout.w[i]}px`
    })
    return layout
}

/**
 * Saisons d'une serie TV : une bulle de verre par saison, triees par numero, et un panneau
 * d'episodes dessous. Une seule saison ouverte a la fois : en ouvrir une ferme l'autre, et la
 * lumiere passe de l'une a l'autre en goutte (season/liquid.ts).
 * ?season et ?episode dans l'URL ouvrent la saison et mettent l'episode en evidence.
 */
export function SeasonList({
    tvId,
    tvdbId,
    title,
    seasons,
    seasonStatuses,
    seasonProgress = [],
    canTriggerSearch,
    canInteractiveSearch,
    canRequest,
}: SeasonListProps) {
    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number)
    const searchParams = useSearchParams()
    const requestedSeason = searchParams.get('season') ? parseInt(searchParams.get('season')!) : null
    const requestedEpisode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : null

    const [open, setOpen] = useState<number | null>(requestedSeason)
    const [lastRequested, setLastRequested] = useState(requestedSeason)
    // Episode vise par le lien (calendrier, notification) : mis en evidence a l'arrivee seulement,
    // pas a chaque reouverture de sa saison
    const [highlightSeason, setHighlightSeason] = useState(requestedSeason)
    if (requestedSeason !== lastRequested) {
        setLastRequested(requestedSeason)
        setHighlightSeason(requestedSeason)
        if (requestedSeason !== null) setOpen(requestedSeason)
    }
    // Saison quittee au dernier changement : la bulle choisie attend la goutte avant de s'eclairer
    const [trail, setTrail] = useState({ open, from: null as number | null })
    if (trail.open !== open) setTrail({ open, from: trail.open })
    const travelling = trail.from !== null && open !== null

    // Saisons demandees depuis la page (en attente sans recharger)
    const [requested, setRequested] = useState<number[]>([])
    const statuses: Record<number, string> = {}
    for (const season of sortedSeasons) {
        const number = season.season_number
        statuses[number] = requested.includes(number)
            ? 'pending'
            : seasonStatuses.find(s => s.seasonNumber === number)?.status || 'unknown'
    }

    // Le panneau suit en priorite basse : la goutte part sans attendre le rendu des episodes
    const panelOpen = useDeferredValue(open)
    const panelId = useId()
    const prefetch = usePrefetchSeasonEpisodes(tvId)
    const rail = useRef<HTMLDivElement>(null)
    const row = useRef<HTMLDivElement>(null)
    const layout = useRef<RowLayout>({ x: [], w: [] })
    const shown = useRef<number | null>(open)
    const running = useRef<Animation[]>([])

    useLayoutEffect(() => {
        const el = row.current
        if (!el) return
        const parts = rowParts(el)
        // Largeurs avant le changement : celles d'une animation en cours, sinon la place d'avant
        const before = layout.current.w
        const moving = (chip: HTMLElement) =>
            running.current.some(a => (a.effect as KeyframeEffect | null)?.target === chip && a.playState === 'running')
        const start = parts.chips.map((chip, i) => (before[i] === undefined || moving(chip) ? chip.getBoundingClientRect().width : before[i]))
        // Decalage laisse par une animation interrompue : la bulle repart d'ou elle est
        const origin = el.getBoundingClientRect().left
        const shift = parts.chips.map(chip => (moving(chip) ? chip.getBoundingClientRect().left - origin - chip.offsetLeft : 0))
        running.current.forEach(a => a.cancel())
        running.current = []
        layout.current = settle(parts)
        const from = shown.current
        shown.current = open
        const index = (n: number | null) => (n === null ? null : parts.chips.findIndex(c => Number(c.dataset.season) === n))
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        // Sur telephone, la bulle choisie vient se placer dans la rangee : defilement horizontal
        // seulement, la page ne bouge pas
        const r = rail.current
        const i = index(open)
        if (r && i !== null && i >= 0 && r.scrollWidth > r.clientWidth) {
            const left = el.getBoundingClientRect().left - r.getBoundingClientRect().left + r.scrollLeft + layout.current.x[i]
            const right = left + layout.current.w[i]
            const pad = 16
            const target = left - pad < r.scrollLeft ? left - pad : right + pad > r.scrollLeft + r.clientWidth ? right + pad - r.clientWidth : null
            if (target !== null) r.scrollTo({ left: target, behavior: reduced ? 'auto' : 'smooth' })
        }
        if (from === open || reduced) return
        running.current = liquidSwitch(parts, index(from), index(open), start, shift, layout.current)
    }, [open])

    // Polices chargees, fenetre redimensionnee : les corps suivent leurs bulles
    useEffect(() => {
        const el = row.current
        if (!el) return
        const observer = new ResizeObserver(() => {
            if (!running.current.some(a => a.playState === 'running')) layout.current = settle(rowParts(el))
        })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    const anchor = (seasonNumber: number) => {
        const el = row.current
        if (!el) return null
        const i = sortedSeasons.findIndex(s => s.season_number === seasonNumber)
        const { x, w } = layout.current
        if (i < 0 || x[i] === undefined) {
            const chip = el.querySelector(`[data-season="${seasonNumber}"]`)
            if (!chip) return null
            const r = chip.getBoundingClientRect()
            return r.left + r.width / 2
        }
        return el.getBoundingClientRect().left + x[i] + w[i] / 2
    }

    const toggle = (seasonNumber: number) => {
        setOpen(open !== seasonNumber ? seasonNumber : null)
        setHighlightSeason(null)
    }

    return (
        <div>
            <div ref={rail} className="onyx-season-rail -mx-4 overflow-x-auto px-4 py-3 scrollbar-hide sm:-mx-8 sm:px-8 md:mx-0 md:px-0">
                <div
                    ref={row}
                    className="relative flex w-max gap-3"
                    style={{ '--onyx-bubble-delay': travelling ? '330ms' : '60ms' } as React.CSSProperties}
                >
                    {/* Calque liquide : corps des bulles et goutte, fusionnes par le filtre */}
                    <div aria-hidden className="onyx-season-goo pointer-events-none absolute -inset-3">
                        <div className="absolute top-3 left-3 flex gap-3">
                            {sortedSeasons.map(season => (
                                <span
                                    key={season.id}
                                    data-body
                                    data-active={open === season.season_number || undefined}
                                    className="h-12 w-12 shrink-0 rounded-full"
                                />
                            ))}
                        </div>
                        <span data-drop className="absolute top-3 left-3 rounded-full" style={{ width: DROP_SIZE, height: DROP_SIZE }} />
                        {TAIL_SIZES.map(size => (
                            <span key={size} data-tail className="absolute top-3 left-3 rounded-full" style={{ width: size, height: size }} />
                        ))}
                    </div>

                    {sortedSeasons.map(season => {
                        const number = season.season_number
                        return (
                            <SeasonBubble
                                key={season.id}
                                season={season}
                                status={statuses[number]}
                                progress={seasonProgress.find(p => p.seasonNumber === number)}
                                active={open === number}
                                panelId={panelId}
                                onToggle={() => toggle(number)}
                                onIntent={() => prefetch(number)}
                            />
                        )
                    })}
                </div>
            </div>

            <svg aria-hidden className="pointer-events-none absolute size-0">
                <filter id="onyx-season-goo" x="-20%" y="-60%" width="140%" height="220%" colorInterpolationFilters="sRGB">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                    <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
            </svg>

            <SeasonEpisodesPanel
                id={panelId}
                open={panelOpen}
                seasons={sortedSeasons}
                anchor={anchor}
                rail={rail}
                statuses={statuses}
                progress={seasonProgress}
                canTriggerSearch={canTriggerSearch}
                canInteractiveSearch={canInteractiveSearch}
                canRequest={canRequest}
                onRequested={n => setRequested(r => (r.includes(n) ? r : [...r, n]))}
                tvId={tvId}
                tvdbId={tvdbId}
                title={title}
                highlightSeason={highlightSeason}
                highlightEpisode={requestedEpisode}
            />
        </div>
    )
}
