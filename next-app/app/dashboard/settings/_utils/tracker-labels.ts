import type { TrackerTypeMeta } from '../_types/tracker'

/** Types de trackers supportes pour le formulaire. */
export const TRACKER_TYPES: TrackerTypeMeta[] = [
    { id: 'gazelle', name: 'Gazelle (RED, OPS, etc.)', description: 'Trackers basés sur Gazelle' },
    { id: 'unit3d', name: 'Unit3d (BLU, Aither, etc.)', description: 'Trackers basés sur Unit3d' },
    { id: 'jackett', name: 'Jackett/Prowlarr', description: 'Via Jackett ou Prowlarr' },
    { id: 'scraper', name: 'Scraper (C411, LaCale, etc.)', description: 'Trackers français nécessitant login' },
    { id: 'custom', name: 'API Personnalisée', description: 'Configuration manuelle' },
]

/**
 * Label custom pour les bonus points selon le tracker.
 * Chaque tracker francais a sa propre terminologie (pirates, tokens, etc.).
 */
export function getBonusLabel(trackerName: string): string {
    const name = (trackerName || '').toLowerCase()
    if (name.includes('la cale') || name.includes('lacale') || name.includes('la-cale')) return 'Doublons'
    if (name.includes('torr9') || name.includes('tor9')) return 'Jetons'
    if (name.includes('abnormal') || name.includes('abn')) return 'Réputation'
    if (name.includes('gemini')) return 'Bonus'
    return 'Points'
}

export function buildEmptyTrackerForm() {
    return {
        name: '',
        type: 'gazelle' as const,
        baseUrl: '',
        apiKey: '',
        username: '',
        password: '',
        passkey: '',
        enabled: true,
    }
}
