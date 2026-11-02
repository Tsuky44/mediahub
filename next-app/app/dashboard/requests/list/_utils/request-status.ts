import { CalendarClock, CheckCircle2, CircleDashed, Clock, Hourglass, Info, type LucideIcon } from 'lucide-react'
import { formatReleaseDate } from '@/lib/release-date'

export interface StatusInfo {
    label: string
    color: string
    /** Teinte de l'icône : seule touche de couleur, très sourde */
    iconColor: string
    bg: string
    border: string
    icon: LucideIcon
    /** Mouvement Onyx : faisceau unique (disponible) ou mini barre (en cours) */
    motion?: 'beam' | 'track'
}

const quiet = { color: 'text-gray-200', bg: 'bg-white/[0.04]', border: 'border-white/10' }

/** Map entre un code de statut numerique (Overseerr) et la representation UI. */
export const REQUEST_STATUS_INFO: Record<number | 'default', StatusInfo> = {
    6: { label: 'Refusée', ...quiet, iconColor: 'text-red-400', icon: Info },
    5: { label: 'Disponible', color: 'text-gray-100', iconColor: 'text-green-400', bg: 'bg-white/[0.06]', border: 'border-white/15', icon: CheckCircle2, motion: 'beam' },
    4: { label: 'Partiel', ...quiet, iconColor: 'text-amber-400', icon: CircleDashed },
    3: { label: 'En cours', ...quiet, iconColor: 'text-amber-400', icon: Hourglass, motion: 'track' },
    2: { label: 'Approuvée', ...quiet, iconColor: 'text-gray-300', icon: CheckCircle2 },
    1: { label: 'En attente', ...quiet, iconColor: 'text-amber-400', icon: Clock },
    default: { label: 'Inconnu', ...quiet, color: 'text-gray-400', iconColor: 'text-gray-500', icon: Info },
}

export function getStatusInfo(status: number): StatusInfo {
    return REQUEST_STATUS_INFO[status] || REQUEST_STATUS_INFO.default
}

/** Demandé mais pas encore sorti : pastille blanche, avec la date quand elle est connue. */
export function getAwaitingReleaseInfo(releaseDate?: string): StatusInfo {
    const date = releaseDate ? formatReleaseDate(releaseDate) : ''
    return {
        label: date ? `Sortie le ${date}` : 'En attente de sortie',
        color: 'text-gray-100',
        iconColor: 'text-gray-100',
        bg: 'bg-white/[0.08]',
        border: 'border-white/20',
        icon: CalendarClock,
    }
}

/**
 * Convertit le code de statut Overseerr en identifiant texte :
 * 1=pending, 2/3=processing, 4=partial, 5=available.
 */
export function mapStatus(status: number): string {
    switch (status) {
        case 5: return 'available'
        case 4: return 'partial'
        case 3: return 'processing'
        case 2: return 'processing'
        case 1: return 'pending'
        case 6: return 'declined'
        default: return 'unknown'
    }
}
