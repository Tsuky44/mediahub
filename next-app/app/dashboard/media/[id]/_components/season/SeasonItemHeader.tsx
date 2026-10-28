'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { SearchActions } from '../SearchActions'
import { SeasonStatusBadges } from './SeasonStatusBadges'
import { SeasonRequestButton } from './SeasonRequestButton'
import type { Season, SeasonProgress, SeasonStatusValue } from '../../_types/season'

interface SeasonItemHeaderProps {
    season: Season
    title: string
    tvId: number
    tvdbId?: number
    allSeasons: Season[]
    status: SeasonStatusValue | string
    progress?: SeasonProgress
    isOpen: boolean
    canTriggerSearch?: boolean
    canInteractiveSearch?: boolean
    canRequest?: boolean
    onToggle: () => void
    onRequestSuccess: () => void
}

/** En-tete d'une saison : poster, titre, badges, actions de recherche, demande, chevron. */
export function SeasonItemHeader({
    season,
    title,
    tvId,
    tvdbId,
    allSeasons,
    status,
    progress,
    isOpen,
    canTriggerSearch,
    canInteractiveSearch,
    canRequest = false,
    onToggle,
    onRequestSuccess,
}: SeasonItemHeaderProps) {
    return (
        <div
            className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-750 transition-colors cursor-pointer"
            onClick={onToggle}
        >
            <div className="flex items-center gap-4">
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-900 relative">
                    {season.poster_path ? (
                        <img
                            loading="lazy"
                            decoding="async"
                            src={`https://image.tmdb.org/t/p/w200${season.poster_path}`}
                            alt={season.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-xs text-gray-500">
                            N/A
                        </div>
                    )}
                </div>
                <div className="text-left">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{season.name}</h4>

                        <SeasonStatusBadges status={status} progress={progress} />

                        {(canTriggerSearch || canInteractiveSearch) && (
                            <SearchActions
                                title={title}
                                canTriggerSearch={canTriggerSearch}
                                canInteractiveSearch={canInteractiveSearch}
                                mediaType="tv"
                                tmdbId={tvId}
                                tvdbId={tvdbId}
                                seasons={allSeasons}
                                initialSeason={season.season_number}
                            />
                        )}

                        {canRequest && status === 'unknown' && (
                            <SeasonRequestButton
                                tvId={tvId}
                                seasonNumber={season.season_number}
                                title={title}
                                onSuccess={onRequestSuccess}
                            />
                        )}
                    </div>
                    <p className="text-sm text-gray-400">
                        {season.episode_count} épisodes • {season.air_date ? new Date(season.air_date).getFullYear() : 'N/A'}
                    </p>
                </div>
            </div>
            {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
        </div>
    )
}
