'use client'

import { useState } from 'react'
import { ChevronDown, Tv } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchActions } from '../SearchActions'
import { SeasonStatusBadges } from './SeasonStatusBadges'
import { SeasonRequestButton } from './SeasonRequestButton'
import type { Season, SeasonProgress } from '../../_types/season'

interface SeasonChipProps {
    season: Season
    title: string
    tvId: number
    tvdbId?: number
    allSeasons: Season[]
    initialStatus: string
    progress?: SeasonProgress
    active: boolean
    panelId: string
    canTriggerSearch?: boolean
    canInteractiveSearch?: boolean
    canRequest?: boolean
    onToggle: () => void
    onIntent: () => void
    chipRef: (el: HTMLDivElement | null) => void
}

/**
 * Puce d'une saison : affiche, titre, badges, recherche, demande et chevron. Toute la puce
 * ouvre ou ferme ses episodes (bouton etire dessous) ; les actions restent cliquables par-dessus.
 * Ouverte, elle s'eclaire : l'affiche rebondit et un reflet la traverse (motion.css, onyx-season-*).
 */
export function SeasonChip({
    season,
    title,
    tvId,
    tvdbId,
    allSeasons,
    initialStatus,
    progress,
    active,
    panelId,
    canTriggerSearch,
    canInteractiveSearch,
    canRequest = false,
    onToggle,
    onIntent,
    chipRef,
}: SeasonChipProps) {
    // Statut local (passe en attente apres une demande), recale si le serveur en envoie un autre
    const [status, setStatus] = useState(initialStatus)
    const [serverStatus, setServerStatus] = useState(initialStatus)
    if (initialStatus !== serverStatus) {
        setServerStatus(initialStatus)
        setStatus(initialStatus)
    }

    const year = season.air_date ? new Date(season.air_date).getFullYear() : null
    const watched = progress && progress.total > 0 ? Math.min(progress.played / progress.total, 1) : 0

    return (
        <div
            ref={chipRef}
            data-active={active || undefined}
            className={cn(
                'onyx-season-chip group/chip relative flex w-[78vw] max-w-[320px] shrink-0 snap-start items-center gap-3 rounded-2xl border p-2.5 pr-2 md:w-auto md:max-w-none',
                'transition-[background-color,border-color,box-shadow,translate,scale] duration-500 ease-out-onyx motion-reduce:transition-none has-[>button:active]:scale-[0.98]',
                active
                    ? 'border-white/20 bg-white/[0.075] shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_18px_40px_-20px_rgb(0_0_0/0.9)]'
                    : 'border-white/[0.06] bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.045]',
            )}
        >
            <button
                type="button"
                aria-expanded={active}
                aria-controls={panelId}
                onClick={onToggle}
                onPointerEnter={onIntent}
                onFocus={onIntent}
                className="absolute inset-0 cursor-pointer rounded-[inherit]"
            >
                <span className="sr-only">
                    {active ? 'Masquer' : 'Afficher'} les épisodes : {season.name}
                </span>
            </button>

            <span aria-hidden className="onyx-season-sheen pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" />

            <div className="onyx-season-poster pointer-events-none relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-white/5 shadow-md ring-1 ring-white/10">
                {season.poster_path ? (
                    <img
                        loading="lazy"
                        decoding="async"
                        src={`https://image.tmdb.org/t/p/w200${season.poster_path}`}
                        alt=""
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-600">
                        <Tv className="size-4" />
                    </div>
                )}
            </div>

            <div className="pointer-events-none min-w-0 flex-1">
                <h4 className={cn('truncate text-sm font-semibold transition-colors duration-300', active ? 'text-white' : 'text-gray-200')}>
                    {season.name}
                </h4>
                <p className="mt-0.5 truncate text-xs text-gray-400">
                    {season.episode_count} épisodes{year ? ` · ${year}` : ''}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 empty:hidden [&>span]:whitespace-nowrap">
                    <SeasonStatusBadges status={status} progress={progress} />
                    {canRequest && status === 'unknown' && (
                        <span className="pointer-events-auto relative z-10">
                            <SeasonRequestButton
                                tvId={tvId}
                                seasonNumber={season.season_number}
                                title={title}
                                onSuccess={() => setStatus('pending')}
                            />
                        </span>
                    )}
                </div>
            </div>

            {(canTriggerSearch || canInteractiveSearch) && (
                <div className="relative z-10">
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
                </div>
            )}

            <ChevronDown
                aria-hidden
                className={cn(
                    'pointer-events-none size-4 shrink-0 transition-[rotate,color] duration-500 ease-spring motion-reduce:transition-none',
                    active ? 'rotate-180 text-white' : 'text-gray-500 group-hover/chip:text-gray-300',
                )}
            />

            {watched > 0 && (
                <span aria-hidden className="pointer-events-none absolute inset-x-4 bottom-0 h-px overflow-hidden rounded-full bg-white/[0.06]">
                    <span
                        className="block h-full origin-left bg-gradient-to-r from-white/30 to-white/80"
                        style={{ scale: `${watched} 1` }}
                    />
                </span>
            )}
        </div>
    )
}
