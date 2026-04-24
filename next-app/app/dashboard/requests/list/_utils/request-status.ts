import { CheckCircle2, Clock, Hourglass, Info, type LucideIcon } from 'lucide-react'

export interface StatusInfo {
    label: string
    color: string
    bg: string
    border: string
    icon: LucideIcon
}

/** Map entre un code de statut numerique (Overseerr) et la representation UI. */
export const REQUEST_STATUS_INFO: Record<number | 'default', StatusInfo> = {
    5: { label: 'Disponible', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 },
    4: { label: 'Partiel', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: CheckCircle2 },
    3: { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Hourglass },
    2: { label: 'Approuvée', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: CheckCircle2 },
    1: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Clock },
    default: { label: 'Inconnu', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: Info },
}

export function getStatusInfo(status: number): StatusInfo {
    return REQUEST_STATUS_INFO[status] || REQUEST_STATUS_INFO.default
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
        default: return 'unknown'
    }
}
