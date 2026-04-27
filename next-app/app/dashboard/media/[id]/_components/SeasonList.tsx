'use client'

import { useSearchParams } from 'next/navigation'
import { SeasonItem } from './season/SeasonItem'
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
 * Liste des saisons d'une serie TV (accordeon par saison).
 * Trie par numero, recupere ?season et ?episode dans l'URL pour ouvrir et highlighter.
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

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {sortedSeasons.map(season => {
                    const status = seasonStatuses.find(s => s.seasonNumber === season.season_number)
                    const progress = seasonProgress.find(p => p.seasonNumber === season.season_number)
                    const isRequested = requestedSeason === season.season_number

                    return (
                        <SeasonItem
                            key={season.id}
                            tvId={tvId}
                            tvdbId={tvdbId}
                            season={season}
                            initialStatus={status?.status || 'unknown'}
                            title={title}
                            progress={progress}
                            allSeasons={seasons}
                            initiallyOpen={isRequested}
                            highlightEpisode={isRequested ? requestedEpisode : null}
                            canTriggerSearch={canTriggerSearch}
                            canInteractiveSearch={canInteractiveSearch}
                            canRequest={canRequest}
                        />
                    )
                })}
            </div>
        </div>
    )
}
