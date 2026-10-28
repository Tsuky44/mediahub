'use client'

import { useId, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { SeasonChip } from './season/SeasonChip'
import { SeasonEpisodesPanel } from './season/SeasonEpisodesPanel'
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

/**
 * Saisons d'une serie TV : une puce par saison, triees par numero, et un panneau d'episodes
 * dessous. Une seule saison ouverte a la fois : en ouvrir une ferme l'autre.
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
    if (requestedSeason !== lastRequested) {
        setLastRequested(requestedSeason)
        if (requestedSeason !== null) setOpen(requestedSeason)
    }

    const panelId = useId()
    const prefetch = usePrefetchSeasonEpisodes(tvId)
    const chips = useRef(new Map<number, HTMLDivElement>())
    const rail = useRef<HTMLDivElement>(null)

    const toggle = (seasonNumber: number) => {
        const opening = open !== seasonNumber
        setOpen(opening ? seasonNumber : null)
        // Sur telephone, la puce choisie vient se placer dans la rangee
        if (opening) chips.current.get(seasonNumber)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }

    return (
        <div>
            <div
                ref={rail}
                className="onyx-stagger -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-1 pb-3 scrollbar-hide sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(280px,1fr))] md:overflow-visible md:p-0"
            >
                {sortedSeasons.map(season => {
                    const number = season.season_number
                    return (
                        <SeasonChip
                            key={season.id}
                            chipRef={el => {
                                if (el) chips.current.set(number, el)
                                else chips.current.delete(number)
                            }}
                            season={season}
                            title={title}
                            tvId={tvId}
                            tvdbId={tvdbId}
                            allSeasons={seasons}
                            initialStatus={seasonStatuses.find(s => s.seasonNumber === number)?.status || 'unknown'}
                            progress={seasonProgress.find(p => p.seasonNumber === number)}
                            active={open === number}
                            panelId={panelId}
                            canTriggerSearch={canTriggerSearch}
                            canInteractiveSearch={canInteractiveSearch}
                            canRequest={canRequest}
                            onToggle={() => toggle(number)}
                            onIntent={() => prefetch(number)}
                        />
                    )
                })}
            </div>

            <SeasonEpisodesPanel
                id={panelId}
                open={open}
                seasons={sortedSeasons}
                chips={chips}
                rail={rail}
                tvId={tvId}
                tvdbId={tvdbId}
                title={title}
                highlightSeason={requestedSeason}
                highlightEpisode={requestedEpisode}
            />
        </div>
    )
}
