import type { LucideIcon } from 'lucide-react'
import { HardDrive, Download, CheckCircle, Pause, Activity } from 'lucide-react'

export interface TorrentStatusFilter {
    id: string
    label: string
    icon: LucideIcon
}

export interface TorrentSortOption {
    id: string
    label: string
}

export interface TorrentColumnOption {
    id: string
    label: string
}

/** Categories de statut affichees en haut de la liste des torrents. */
export const STATUS_FILTERS: TorrentStatusFilter[] = [
    { id: 'all', label: 'Tous', icon: HardDrive },
    { id: 'downloading', label: 'En cours', icon: Download },
    { id: 'completed', label: 'Terminés', icon: CheckCircle },
    { id: 'paused', label: 'En pause', icon: Pause },
    { id: 'active', label: 'Actifs', icon: Activity },
]

/** Options de tri (dropdown principal + FilterModal). */
export const SORT_OPTIONS: TorrentSortOption[] = [
    { id: 'added_on', label: "Date d'ajout" },
    { id: 'name', label: 'Nom' },
    { id: 'size', label: 'Taille' },
    { id: 'progress', label: 'Progression' },
    { id: 'amount_left', label: 'Restant' },
    { id: 'eta', label: 'ETA' },
    { id: 'global_speed', label: 'Vitesse globale' },
    { id: 'dlspeed', label: 'Vitesse Down' },
    { id: 'upspeed', label: 'Vitesse Up' },
    { id: 'ratio', label: 'Ratio' },
    { id: 'downloaded', label: 'Total Downloadé' },
    { id: 'uploaded', label: 'Total Uploadé' },
    { id: 'num_seeds', label: 'Seeds' },
    { id: 'num_leechs', label: 'Peers' },
    { id: 'availability', label: 'Disponibilité' },
    { id: 'last_activity', label: 'Dernière activité' },
    { id: 'completion_on', label: 'Date de fin' },
    { id: 'category', label: 'Catégorie' },
]

/** Colonnes affichables dans la liste. */
export const COLUMN_OPTIONS: TorrentColumnOption[] = [
    { id: 'tracker', label: 'Tracker' },
    { id: 'tags', label: 'Tags' },
    { id: 'category', label: 'Catégorie' },
    { id: 'added_on', label: "Date d'ajout" },
    { id: 'completion_on', label: 'Date de fin' },
    { id: 'last_activity', label: 'Dernière activité' },
    { id: 'status', label: 'Statut' },
    { id: 'download_info', label: 'Téléchargement' },
    { id: 'upload_info', label: 'Envoi' },
    { id: 'peers', label: 'Peers (Seeds/Leechs)' },
    { id: 'availability', label: 'Disponibilité' },
    { id: 'ratio', label: 'Ratio' },
    { id: 'progress_bar', label: 'Barre de progression' },
    { id: 'progress_text', label: 'Pourcentage' },
    { id: 'eta', label: 'ETA' },
]
