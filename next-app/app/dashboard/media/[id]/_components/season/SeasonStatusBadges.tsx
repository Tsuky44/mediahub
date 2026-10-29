'use client'

import { CalendarClock, Check, Clock } from 'lucide-react'
import type { SeasonStatusValue } from '../../_types/season'

interface SeasonStatusBadgesProps {
    status: SeasonStatusValue | string
    /** Episodes encore a venir */
    remaining?: number
}

const restants = (n: number) => `${n} restant${n > 1 ? 's' : ''}`

/**
 * Pastille d'etat d'une saison (en-tete du panneau d'episodes) : sa disponibilite et, tant qu'elle
 * n'est pas complete, le nombre d'episodes encore a venir. « Vu » reste sur les episodes.
 */
export function SeasonStatusBadges({ status, remaining }: SeasonStatusBadgesProps) {
    return (
        <>
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
                    {!!remaining && (
                        <span>
                            <span className="hidden sm:inline">· </span>
                            {restants(remaining)}
                        </span>
                    )}
                </span>
            )}
            {(status === 'pending' || status === 'processing') && (
                <span
                    title={remaining ? `${restants(remaining)} à télécharger` : undefined}
                    className="flex items-center gap-1 rounded-full bg-yellow-900/50 px-2 py-0.5 text-xs font-medium text-yellow-400 border border-yellow-800"
                >
                    <Clock className="h-3 w-3" />
                    <span>{remaining ? restants(remaining) : 'En attente'}</span>
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
