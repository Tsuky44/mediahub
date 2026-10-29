import { Server, Tv, MonitorPlay, UserCircle, Play } from 'lucide-react'
import type { ReactNode } from 'react'

export type LoginProvider = 'emby' | 'plex' | 'jellyfin' | 'onyx' | 'local'

export interface EnabledProviders {
    emby: boolean
    plex: boolean
    jellyfin: boolean
    onyx?: boolean
    local: boolean
}

/** Determine le provider par defaut selon ceux actives. */
export function getDefaultProvider(enabled: EnabledProviders): LoginProvider {
    if (enabled.emby) return 'emby'
    if (enabled.jellyfin) return 'jellyfin'
    if (enabled.plex) return 'plex'
    if (enabled.onyx) return 'onyx'
    if (enabled.local) return 'local'
    return 'local'
}

/** Bouton de provider : verre éclairé quand il est choisi, monochrome comme l'app. */
export function getProviderColor(active: boolean): string {
    return active
        ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]'
        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
}

/** Label affiche pour le provider. */
export function getProviderLabel(p: LoginProvider): string {
    switch (p) {
        case 'emby': return 'Emby'
        case 'plex': return 'Plex'
        case 'jellyfin': return 'Jellyfin'
        case 'onyx': return 'Onyx'
        case 'local': return 'Local'
    }
}

/** Icone associee au provider. */
export function getProviderIcon(p: LoginProvider): ReactNode {
    switch (p) {
        case 'emby': return <Server className="h-5 w-5 text-gray-400" />
        case 'plex': return <Tv className="h-5 w-5 text-gray-400" />
        case 'jellyfin': return <MonitorPlay className="h-5 w-5 text-gray-400" />
        case 'onyx': return <Play className="h-5 w-5 text-gray-400" />
        case 'local': return <UserCircle className="h-5 w-5 text-gray-400" />
    }
}
