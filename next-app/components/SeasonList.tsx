'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, PlayCircle, Check, Clock, Download } from 'lucide-react'
import { getSeasonDetails, requestSeason } from '@/app/dashboard/media/[id]/actions'
import clsx from 'clsx'

interface Season {
    id: number
    name: string
    season_number: number
    episode_count: number
    air_date: string
    poster_path: string | null
    overview: string
}

interface Episode {
    id: number
    name: string
    overview: string
    still_path: string | null
    episode_number: number
    air_date: string
    vote_average: number
    runtime: number
    userData?: {
        played: boolean
        playedPercentage?: number
    }
}

interface SeasonStatus {
    seasonNumber: number
    status: number // 5=Available, 4=Partial, 2=Pending
}

export interface SeasonProgress {
    seasonNumber: number
    played: number
    total: number
    isWatched: boolean
}

interface SeasonListProps {
    tvId: number
    seasons: Season[]
    seasonStatuses: SeasonStatus[]
    seasonProgress?: SeasonProgress[]
}

export function SeasonList({ tvId, seasons, seasonStatuses, seasonProgress = [] }: SeasonListProps) {
    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number)

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Saisons</h3>
            <div className="space-y-2">
                {sortedSeasons.map((season) => {
                    const status = seasonStatuses.find(s => s.seasonNumber === season.season_number)
                    const progress = seasonProgress.find(p => p.seasonNumber === season.season_number)
                    return (
                        <SeasonItem 
                            key={season.id} 
                            tvId={tvId} 
                            season={season} 
                            initialStatus={status?.status}
                            title={season.name} 
                            progress={progress}
                        />
                    )
                })}
            </div>
        </div>
    )
}

function SeasonItem({ tvId, season, initialStatus, title, progress }: { tvId: number, season: Season, initialStatus?: number, title: string, progress?: SeasonProgress }) {
    const [isOpen, setIsOpen] = useState(false)
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [status, setStatus] = useState(initialStatus)
    const [requesting, setRequesting] = useState(false)

    // Sync status when props change (e.g. after parent re-render/revalidation)
    if (initialStatus !== undefined && initialStatus !== status) {
        setStatus(initialStatus)
    }

    const toggleOpen = async () => {
        if (isOpen) {
            setIsOpen(false)
            return
        }

        setIsOpen(true)

        if (!loaded && !loading) {
            setLoading(true)
            const data = await getSeasonDetails(tvId, season.season_number)
            if (data && data.episodes) {
                setEpisodes(data.episodes)
                setLoaded(true)
            }
            setLoading(false)
        }
    }

    const handleRequest = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (requesting || status === 2 || status === 3 || status === 4 || status === 5) return

        setRequesting(true)
        const result = await requestSeason(tvId, season.season_number, title)
        if (result.success) {
            setStatus(2) // Set to pending
        } else {
            alert('Erreur lors de la demande')
        }
        setRequesting(false)
    }

    return (
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
            <button
                onClick={toggleOpen}
                className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-750 transition-colors"
            >
                <div className="flex items-center gap-4">
                     <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-900 relative">
                        {season.poster_path ? (
                            <img
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
                            
                            {/* Watched Status / Progress in Header */}
                            {progress && (
                                <>
                                    {progress.isWatched ? (
                                        <span className="flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-800">
                                            <Check className="h-3 w-3" />
                                            <span className="hidden sm:inline">Vu</span>
                                        </span>
                                    ) : (
                                        progress.played > 0 && (
                                            <span className="flex items-center gap-1 rounded-full bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-800">
                                                <span className="hidden sm:inline">{progress.total - progress.played} restants</span>
                                            </span>
                                        )
                                    )}
                                </>
                            )}

                            {/* Status Icon Next to Title */}
                            {status === 5 && (
                                <span className="flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-800">
                                    <Check className="h-3 w-3" />
                                    <span className="hidden sm:inline">Disponible</span>
                                </span>
                            )}
                            {status === 4 && (
                                <span className="flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-800">
                                    <Check className="h-3 w-3" />
                                    <span className="hidden sm:inline">Disponible</span>
                                </span>
                            )}
                            {(status === 2 || status === 3) && (
                                <span className="flex items-center gap-1 rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs font-medium text-yellow-400 border border-yellow-800">
                                    <Clock className="h-3 w-3" />
                                    <span className="hidden sm:inline">En attente</span>
                                </span>
                            )}
                            
                            {/* Request Button if not requested/available */}
                            {!status && (
                                <div
                                    role="button"
                                    onClick={handleRequest}
                                    className={clsx(
                                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border transition-colors",
                                        requesting 
                                            ? "bg-gray-700 text-gray-400 border-gray-600 cursor-wait" 
                                            : "bg-indigo-600/80 text-white border-indigo-500 hover:bg-indigo-500 cursor-pointer"
                                    )}
                                >
                                    {requesting ? (
                                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                                    ) : (
                                        <Download className="h-3 w-3" />
                                    )}
                                    <span className="hidden sm:inline">Demander</span>
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-400">
                            {season.episode_count} épisodes • {season.air_date ? new Date(season.air_date).getFullYear() : 'N/A'}
                        </p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </button>

            {isOpen && (
                <div className="border-t border-gray-700 bg-gray-900/50 p-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-500"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {episodes.map((episode) => (
                                <div key={episode.id} className="flex flex-col gap-4 rounded-lg bg-gray-800 p-4 sm:flex-row">
                                    {/* Episode Image */}
                                    <div className="relative h-32 w-full flex-shrink-0 overflow-hidden rounded-md sm:w-56 bg-gray-900">
                                        {episode.still_path ? (
                                            <img
                                                src={`https://image.tmdb.org/t/p/w500${episode.still_path}`}
                                                alt={episode.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-gray-600">
                                                No Image
                                            </div>
                                        )}
                                        <div className="absolute top-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-bold text-white">
                                            E{episode.episode_number}
                                        </div>

                                        {/* Watched Status */}
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

                                    {/* Episode Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <h5 className="font-bold text-white">{episode.name}</h5>
                                            <span className="text-xs text-gray-500">
                                                {episode.air_date ? new Date(episode.air_date).toLocaleDateString() : ''}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-400 line-clamp-3">
                                            {episode.overview || "Aucun résumé disponible."}
                                        </p>
                                        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                                            {episode.runtime ? (
                                                <span>{episode.runtime} min</span>
                                            ) : null}
                                            {episode.vote_average > 0 && (
                                                <span className="flex items-center gap-1 text-yellow-500">
                                                    ★ {episode.vote_average.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
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
