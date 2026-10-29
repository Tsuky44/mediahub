'use client'

import { CalendarClock, Check, Clock } from 'lucide-react'
import type { SeasonProgress, SeasonStatusValue } from '../../_types/season'

interface SeasonStatusBadgesProps {
    status: SeasonStatusValue | string
    progress?: SeasonProgress
}

/**
 * Pastille d'etat d'une saison (en-tete du panneau d'episodes) : sa disponibilite, avec les
 * episodes qui restent a voir quand on l'a commencee. « Vu » reste sur les episodes.
 */
export function SeasonStatusBadges({ status, progress }: SeasonStatusBadgesProps) {
    const left = progress && !progress.isWatched && progress.played > 0 ? progress.total - progress.played : 0
    const rest = left > 0 && (
        <span>
            <span className="hidden sm:inline">· </span>
            {left} restants
        </span>
    )
    return (
        <>
            {status === 'available' && (
                <span className="flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-800">
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">Disponible</span>
                    {rest}
                </span>
            )}
            {status === 'partial' && (
                <span className="flex items-center gap-1 rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-800">
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">Partiellement disponible</span>
                    {rest}
                </span>
            )}
            {(status === 'pending' || status === 'processing') && (
                <span className="flex items-center gap-1 rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs font-medium text-yellow-400 border border-yellow-800">
                    <Clock className="h-3 w-3" />
                    <span className="hidden sm:inline">En attente</span>
                </span>
            )}
            {status === 'unreleased' && (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-100 border border-white/20">
                    <CalendarClock className="h-3 w-3" />
                    <span className="hidden sm:inline">Pas encore diffusée</span>
                </span>
            )}
        </>
    )
}
