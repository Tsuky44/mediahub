'use client'

import { cn } from '@/lib/utils'
import { useSeasonEpisodes } from '../../_hooks/useSeasonEpisodes'
import { useEpisodeHighlight } from '../../_hooks/useEpisodeHighlight'
import { SearchActions } from '../SearchActions'
import { EpisodeCard } from './EpisodeCard'
import { SeasonStatusBadges } from './SeasonStatusBadges'
import { SeasonRequestButton } from './SeasonRequestButton'
import type { Season } from '../../_types/season'

interface SeasonEpisodesProps {
    tvId: number
    tvdbId?: number
    title: string
    season: Season
    allSeasons: Season[]
    status: string
    /** Episodes encore a venir */
    remaining?: number
    canTriggerSearch?: boolean
    canInteractiveSearch?: boolean
    canRequest?: boolean
    onRequested: (seasonNumber: number) => void
    /** Sens du changement de saison : 1 vers la droite, -1 vers la gauche, 0 a l'ouverture */
    dir: number
    leaving?: boolean
    highlightEpisode?: number | null
    className?: string
}

function EpisodeSkeleton() {
    return (
        <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3 sm:flex-row sm:p-4">
            <div className="onyx-skeleton h-32 w-full shrink-0 rounded-xl sm:w-56" />
            <div className="flex-1 space-y-3 py-1">
                <div className="onyx-skeleton h-4 w-2/5 rounded-md" />
                <div className="onyx-skeleton h-3 w-full rounded-md" />
                <div className="onyx-skeleton h-3 w-4/5 rounded-md" />
            </div>
        </div>
    )
}

/**
 * Saison dans le panneau : en-tete (statut, recherche, demande) puis episodes. A l'arrivee, tout
 * glisse en cascade depuis le cote de la bulle choisie (ou monte a l'ouverture) ; en partant, la
 * saison file de l'autre cote.
 */
export function SeasonEpisodes({
    tvId,
    tvdbId,
    title,
    season,
    allSeasons,
    status,
    remaining,
    canTriggerSearch,
    canInteractiveSearch,
    canRequest = false,
    onRequested,
    dir,
    leaving = false,
    highlightEpisode,
    className,
}: SeasonEpisodesProps) {
    const { episodes, loading, loaded, error } = useSeasonEpisodes(tvId, season.season_number)

    useEpisodeHighlight(loaded && !leaving, highlightEpisode)

    const year = season.air_date ? new Date(season.air_date).getFullYear() : null
    const style = {
        '--onyx-sx': `${dir * 44}px`,
        '--onyx-sy': dir ? '0px' : '18px',
    } as React.CSSProperties

    return (
        <div
            inert={leaving}
            aria-hidden={leaving || undefined}
            className={cn(leaving && 'onyx-season-out', className)}
            style={style}
        >
            <div className="onyx-season-head mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
                <h3 className="text-base font-semibold text-white">{season.name}</h3>
                <span className="text-sm text-gray-400">
                    {season.episode_count} épisodes{year ? ` · ${year}` : ''}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 empty:hidden [&>span]:whitespace-nowrap">
                    <SeasonStatusBadges status={status} remaining={remaining} />
                    {/* Saison pas encore demandee : le bouton prend la place des pastilles */}
                    {canRequest && status === 'unknown' && (
                        <SeasonRequestButton
                            tvId={tvId}
                            seasonNumber={season.season_number}
                            title={title}
                            onSuccess={() => onRequested(season.season_number)}
                        />
                    )}
                </div>
                <span className="flex-1" />
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
            </div>
            {loading ? (
                <div className="onyx-season-cascade space-y-3">
                    {Array.from({ length: Math.min(Math.max(season.episode_count, 1), 6) }, (_, i) => (
                        <EpisodeSkeleton key={i} />
                    ))}
                </div>
            ) : error ? (
                <p className="py-8 text-center text-sm text-red-400">
                    Impossible de charger les épisodes (Saison introuvable sur TMDB).
                </p>
            ) : episodes.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Aucun épisode trouvé.</p>
            ) : (
                <div className="onyx-season-cascade space-y-3">
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
                </div>
            )}
        </div>
    )
}
