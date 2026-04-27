import { Film, Tv, Music, Gamepad, Book } from 'lucide-react'
import type { ProwlarrCategory } from './prowlarr-types'

export const RESULTS_PER_PAGE = 200

export const CATEGORIES: ProwlarrCategory[] = [
    { id: 2000, name: 'Films', icon: Film },
    { id: 5000, name: 'Séries', icon: Tv },
    { id: 3000, name: 'Musique', icon: Music },
    { id: 4000, name: 'PC / Jeux', icon: Gamepad },
    { id: 7000, name: 'Livres', icon: Book },
]

/** Convertit une taille en octets vers un format lisible. */
export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/** Retourne un age relatif en jours ou "Aujourd'hui". */
export function getAge(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays < 1) return "Aujourd'hui"
    return `${diffDays}j`
}

/** Construit la query pour une saison/episode de serie TV. */
export function buildTvQuery(title: string, season: number, episode: number | null): string {
    const seasonStr = season < 10 ? `0${season}` : `${season}`
    let query = `${title} S${seasonStr}`
    if (episode) {
        const episodeStr = episode < 10 ? `0${episode}` : `${episode}`
        query += `E${episodeStr}`
    }
    return query
}
