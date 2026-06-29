'use client'

import { useEffect, useState } from 'react'
import { useSeasonEpisodes } from '../../_hooks/useSeasonEpisodes'
import { useEpisodeHighlight } from '../../_hooks/useEpisodeHighlight'
import { SeasonItemHeader } from './SeasonItemHeader'
import { EpisodeCard } from './EpisodeCard'
import type { Season, SeasonProgress } from '../../_types/season'

interface SeasonItemProps {
    tvId: number
    tvdbId?: number
    season: Season
    initialStatus: string
    title: string
    progress?: SeasonProgress
    allSeasons: Season[]
    initiallyOpen?: boolean
    highlightEpisode?: number | null
    canTriggerSearch?: boolean
    canInteractiveSearch?: boolean
    canRequest?: boolean
}

/** Element accordeon d'une saison : header + liste d'episodes lazy-load. */
export function SeasonItem({
    tvId,
    tvdbId,
    season,
    initialStatus,
    title,
    progress,
    allSeasons,
    initiallyOpen = false,
    highlightEpisode,
    canTriggerSearch,
    canInteractiveSearch,
    canRequest,
}: SeasonItemProps) {
    const [status, setStatus] = useState(initialStatus)
    const { isOpen, episodes, loading, loaded, error, toggleOpen } =
        useSeasonEpisodes(tvId, season.season_number, initiallyOpen)

    useEpisodeHighlight(loaded, highlightEpisode)

    useEffect(() => {
        setStatus(initialStatus)
    }, [initialStatus])

    return (
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-all duration-300">
            <SeasonItemHeader
                season={season}
                title={title}
                tvId={tvId}
                tvdbId={tvdbId}
                allSeasons={allSeasons}
                status={status}
                progress={progress}
                isOpen={isOpen}
                canTriggerSearch={canTriggerSearch}
                canInteractiveSearch={canInteractiveSearch}
                canRequest={canRequest}
                onToggle={toggleOpen}
                onRequestSuccess={() => setStatus('pending')}
            />

            {isOpen && (
                <div className="border-t border-gray-700 bg-gray-900/50 p-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-500" />
                        </div>
                    ) : error ? (
                        <div className="flex justify-center py-8 text-red-400">
                            Impossible de charger les épisodes (Saison introuvable sur TMDB).
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {episodes.map(episode => (
                                <EpisodeCard
                                    key={episode.id}
                                    episode={episode}
                                    title={title}
                                    tvId={tvId}
                                    tvdbId={tvdbId}
                                    seasonNumber={season.season_number}
                                    allSeasons={allSeasons}
                                />
                            ))}
                            {episodes.length === 0 && (
                                <p className="text-center text-gray-500">Aucun épisode trouvé.</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
