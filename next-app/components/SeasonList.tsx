'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronUp, PlayCircle, Check, Clock, Download } from 'lucide-react'
import { getSeasonDetails, requestSeason } from '@/app/dashboard/media/[id]/actions'
import { SearchActions } from '@/components/SearchActions'
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
    status: 'unknown' | 'available' | 'partial' | 'pending' | 'processing'
}

export interface SeasonProgress {
    seasonNumber: number
    played: number
    total: number
    isWatched: boolean
}

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

export function SeasonList({ tvId, tvdbId, title, seasons, seasonStatuses, seasonProgress = [], canTriggerSearch, canInteractiveSearch, canRequest }: SeasonListProps) {
    const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number)
    const searchParams = useSearchParams()
    const requestedSeason = searchParams.get('season') ? parseInt(searchParams.get('season')!) : null
    const requestedEpisode = searchParams.get('episode') ? parseInt(searchParams.get('episode')!) : null

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {sortedSeasons.map((season) => {
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

function SeasonItem({ 
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
    canRequest = false
}: { 
    tvId: number, 
    tvdbId?: number, 
    season: Season, 
    initialStatus: string, 
    title: string, 
    progress?: SeasonProgress, 
    allSeasons: Season[], 
    initiallyOpen?: boolean, 
    highlightEpisode?: number | null,
    canTriggerSearch?: boolean,
    canInteractiveSearch?: boolean,
    canRequest?: boolean
}) {
    const [isOpen, setIsOpen] = useState(initiallyOpen)
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [loading, setLoading] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [status, setStatus] = useState(initialStatus)
    const [requesting, setRequesting] = useState(false)
    const [error, setError] = useState(false)

    // Sync status when props change (e.g. after parent re-render/revalidation)
    useEffect(() => {
        setStatus(initialStatus)
    }, [initialStatus])

    // Load episodes if initially open
    useEffect(() => {
        if (initiallyOpen && !loaded && !loading) {
            loadEpisodes()
        }
    }, [initiallyOpen, loaded, loading])

    // Scroll to episode
    useEffect(() => {
        if (loaded && highlightEpisode) {
            // Small delay to ensure rendering
            setTimeout(() => {
                const el = document.getElementById(`episode-${highlightEpisode}`)
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    // Add highlight class
                    el.classList.add('bg-indigo-500/10', 'ring-1', 'ring-indigo-500/50')
                    setTimeout(() => {
                        el.classList.remove('bg-indigo-500/10', 'ring-1', 'ring-indigo-500/50')
                    }, 3000)
                }
            }, 100)
        }
    }, [loaded, highlightEpisode])

    const loadEpisodes = async () => {
        setLoading(true)
        setError(false)
        try {
            const data = await getSeasonDetails(tvId, season.season_number)
            if (data && data.episodes) {
                setEpisodes(data.episodes)
                setLoaded(true)
            } else {
                setError(true)
            }
        } catch (error) {
            console.error('Failed to load episodes', error)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    const toggleOpen = async () => {
        if (isOpen) {
            setIsOpen(false)
            return
        }
        
        setIsOpen(true)
        if (!loaded) {
            await loadEpisodes()
        }
    }

    const handleRequest = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (requesting || status === 'pending' || status === 'processing' || status === 'available') return

        setRequesting(true)
        const result = await requestSeason(tvId, season.season_number, title)
        if (result.success) {
            setStatus('pending')
        } else {
            alert('Erreur lors de la demande')
        }
        setRequesting(false)
    }

    return (
        <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
            <div
                className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={toggleOpen}
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
                            {status === 'available' && (
                                <span className="flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-800">
                                    <Check className="h-3 w-3" />
                                    <span className="hidden sm:inline">Disponible</span>
                                </span>
                            )}
                            {status === 'partial' && (
                                <span className="flex items-center gap-1 rounded-full bg-purple-900/50 px-2 py-0.5 text-xs font-medium text-purple-400 border border-purple-800">
                                    <Check className="h-3 w-3" />
                                    <span className="hidden sm:inline">Partiellement disponible</span>
                                </span>
                            )}
                            {(status === 'pending' || status === 'processing') && (
                                <span className="flex items-center gap-1 rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs font-medium text-yellow-400 border border-yellow-800">
                                    <Clock className="h-3 w-3" />
                                    <span className="hidden sm:inline">En attente</span>
                                </span>
                            )}
                            
                            {/* Search Actions for Season */}
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

                            {/* Request Button if not requested/available */}
                            {canRequest && status === 'unknown' && (
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
                                        <>
                                            <Download className="h-3 w-3" />
                                            <span>Demander</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-400">
                            {season.episode_count} épisodes • {season.air_date ? new Date(season.air_date).getFullYear() : 'N/A'}
                        </p>
                    </div>
                </div>
                {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
            </div>

            {isOpen && (
                <div className="border-t border-gray-700 bg-gray-900/50 p-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-500"></div>
                        </div>
                    ) : error ? (
                        <div className="flex justify-center py-8 text-red-400">
                            Impossible de charger les épisodes (Saison introuvable sur TMDB).
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {episodes.map((episode) => (
                                <div key={episode.id} id={`episode-${episode.episode_number}`} className="flex flex-col gap-4 rounded-lg bg-gray-800 p-4 sm:flex-row transition-all duration-500">
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
                                                    initialSeason={season.season_number}
                                                    initialEpisode={episode.episode_number}
                                                />
                                            </div>
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
