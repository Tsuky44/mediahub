'use client'

import { cn } from '@/lib/utils'
import type { Season, SeasonProgress } from '../../_types/season'

interface SeasonBubbleProps {
    season: Season
    status: string
    progress?: SeasonProgress
    active: boolean
    panelId: string
    onToggle: () => void
    onIntent: () => void
}

const RING = 2 * Math.PI * 16

/** Point de statut : vert disponible, demi-ambre partiel, ambre en attente, cercle blanc a venir */
export function SeasonStatusDot({ status, className }: { status: string; className?: string }) {
    const tone: Record<string, string> = {
        available: 'bg-green-400 shadow-[0_0_6px_rgb(74_222_128/0.7)]',
        partial: 'bg-[linear-gradient(90deg,var(--color-amber-400)_50%,#5b5856_50%)]',
        pending: 'bg-amber-400 animate-pulse',
        processing: 'bg-amber-400 animate-pulse',
        unreleased: 'shadow-[inset_0_0_0_1.5px_rgb(242_240_237/0.85)]',
    }
    if (!tone[status]) return null
    return <span aria-hidden className={cn('inline-block size-[7px] shrink-0 rounded-full', tone[status], className)} />
}

/**
 * Bulle d'une saison : son numero et un anneau de progression. Choisie, elle se gonfle en
 * pilule et montre son affiche, son nom et son nombre d'episodes (motion.css, onyx-season-*).
 * Son corps liquide est dessine a part, dans le calque filtre de SeasonList.
 */
export function SeasonBubble({ season, status, progress, active, panelId, onToggle, onIntent }: SeasonBubbleProps) {
    const number = season.season_number
    const year = season.air_date ? new Date(season.air_date).getFullYear() : null
    const watched = progress && progress.total > 0 ? Math.min(progress.played / progress.total, 1) : 0

    return (
        <button
            type="button"
            data-season={number}
            data-active={active || undefined}
            aria-expanded={active}
            aria-controls={panelId}
            aria-label={`${season.name}, ${season.episode_count} épisodes`}
            title={`${season.name} · ${season.episode_count} épisodes`}
            onClick={onToggle}
            onPointerEnter={onIntent}
            onFocus={onIntent}
            className={cn(
                'onyx-season-bubble relative z-[1] flex h-12 shrink-0 cursor-pointer items-center overflow-hidden rounded-full',
                active ? 'w-auto' : 'w-12',
            )}
        >
            <span aria-hidden className="onyx-season-rim pointer-events-none absolute inset-0 rounded-full" />
            <span className="relative ml-[7px] grid size-[34px] shrink-0 place-items-center">
                <span className="onyx-season-num text-sm font-bold tabular-nums">{number === 0 ? 'SP' : number}</span>
                {season.poster_path ? (
                    <img
                        loading="lazy"
                        decoding="async"
                        src={`https://image.tmdb.org/t/p/w92${season.poster_path}`}
                        alt=""
                        className="onyx-season-avatar absolute inset-[3px] size-7 rounded-full object-cover"
                    />
                ) : (
                    <span className="onyx-season-avatar absolute inset-[3px] rounded-full bg-white/10" />
                )}
                <svg aria-hidden viewBox="0 0 34 34" className="pointer-events-none absolute inset-0 -rotate-90">
                    <circle cx="17" cy="17" r="16" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1.5" />
                    {watched > 0 && (
                        <circle
                            cx="17"
                            cy="17"
                            r="16"
                            fill="none"
                            stroke="rgb(242 240 237 / 0.85)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeDasharray={`${RING * watched} ${RING}`}
                        />
                    )}
                </svg>
            </span>
            <span className="onyx-season-label flex shrink-0 flex-col items-start whitespace-nowrap pr-4 pl-2.5 text-left leading-tight">
                <span className="text-sm font-semibold text-white">{season.name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <SeasonStatusDot status={status} />
                    {season.episode_count} épisodes{year ? ` · ${year}` : ''}
                </span>
            </span>
            <SeasonStatusDot
                status={status}
                className="onyx-season-pip absolute right-[6px] bottom-[6px] ring-2 ring-[#0c0d0d]"
            />
        </button>
    )
}
