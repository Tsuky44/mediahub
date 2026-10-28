'use client'

import { CalendarClock, Check, Clock } from 'lucide-react'
import type { SeasonProgress, SeasonStatusValue } from '../../_types/season'

interface SeasonStatusBadgesProps {
    status: SeasonStatusValue | string
    progress?: SeasonProgress
}

/** Badges d'etat d'une saison : vu/restants + disponible/partiel/en attente. */
export function SeasonStatusBadges({ status, progress }: SeasonStatusBadgesProps) {
    return (
        <>
            {progress && (progress.isWatched ? (
                <span className="flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-800">
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">Vu</span>
                </span>
            ) : progress.played > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-blue-900/50 px-2 py-0.5 text-xs font-medium text-blue-400 border border-blue-800">
                    <span className="hidden sm:inline">{progress.total - progress.played} restants</span>
                </span>
            ))}

            {status === 'available' && (
                <span className="flex items-center gap-1 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400 border border-green-800">
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">Disponible</span>
                </span>
            )}
            {status === 'partial' && (
                <span className="flex items-center gap-1 rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-800">
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
            {status === 'unreleased' && (
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-100 border border-white/20">
                    <CalendarClock className="h-3 w-3" />
                    <span className="hidden sm:inline">Pas encore diffusée</span>
                </span>
            )}
        </>
    )
}
