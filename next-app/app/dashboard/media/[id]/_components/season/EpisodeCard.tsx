'use client'

import { Check } from 'lucide-react'
import { SearchActions } from '../SearchActions'
import type { Episode, Season } from '../../_types/season'

interface EpisodeCardProps {
    episode: Episode
    title: string
    tvId: number
    tvdbId?: number
    seasonNumber: number
    allSeasons: Season[]
}

/** Carte d'un episode avec image (still), badges (vu, progression) et SearchActions. */
export function EpisodeCard({ episode, title, tvId, tvdbId, seasonNumber, allSeasons }: EpisodeCardProps) {
    return (
        <div
            id={`episode-${episode.episode_number}`}
            className="flex flex-col gap-4 rounded-lg bg-gray-800 p-4 sm:flex-row transition-all duration-500"
        >
            <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-md sm:w-56 bg-gray-900">
                {episode.still_path ? (
                    <img
                        src={`https://image.tmdb.org/t/p/w500${episode.still_path}`}
                        alt={episode.name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-600">No Image</div>
                )}
                <div className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-bold text-white">
                    E{episode.episode_number}
                </div>

                {episode.userData?.played && (
                    <div className="absolute top-2 right-2 rounded bg-green-600/90 px-1.5 py-0.5 text-xs font-bold text-white shadow-sm flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span className="hidden sm:inline">Vu</span>
                    </div>
                )}
                {!episode.userData?.played && episode.userData?.playedPercentage ? (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                        <div className="h-full bg-indigo-500" style={{ width: `${episode.userData.playedPercentage}%` }} />
                    </div>
                ) : null}
            </div>

            <div className="flex-1">
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <h5 className="font-bold text-white">{episode.name}</h5>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">
                            {episode.air_date ? new Date(episode.air_date).toLocaleDateString() : ''}
                        </span>
                        <SearchActions
                            title={title}
                            canManage={true}
                            mediaType="tv"
                            tmdbId={tvId}
                            tvdbId={tvdbId}
                            seasons={allSeasons}
                            initialSeason={seasonNumber}
                            initialEpisode={episode.episode_number}
                        />
                    </div>
                </div>
                <p className="mt-2 text-sm text-gray-400 line-clamp-3">
                    {episode.overview || 'Aucun résumé disponible.'}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                    {episode.runtime ? <span>{episode.runtime} min</span> : null}
                    {episode.vote_average > 0 && (
                        <span className="flex items-center gap-1 text-yellow-500">
                            ★ {episode.vote_average.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
