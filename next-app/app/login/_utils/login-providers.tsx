import { Server, Tv, MonitorPlay, UserCircle } from 'lucide-react'
import type { ReactNode } from 'react'

export type LoginProvider = 'emby' | 'plex' | 'jellyfin' | 'local'

export interface EnabledProviders {
    emby: boolean
    plex: boolean
    jellyfin: boolean
    local: boolean
}

/** Determine le provider par defaut selon ceux actives. */
export function getDefaultProvider(enabled: EnabledProviders): LoginProvider {
    if (enabled.local) return 'local'
    if (enabled.emby) return 'emby'
    if (enabled.plex) return 'plex'
    if (enabled.jellyfin) return 'jellyfin'
    return 'local'
}

/** Couleur du provider (avec etat actif/inactif). */
export function getProviderColor(p: LoginProvider, active: boolean): string {
    switch (p) {
        case 'emby': return active ? 'bg-green-600 text-white' : 'bg-green-600/10 text-green-500 hover:bg-green-600/20'
        case 'plex': return active ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
        case 'jellyfin': return active ? 'bg-purple-600 text-white' : 'bg-purple-600/10 text-purple-500 hover:bg-purple-600/20'
        case 'local': return active ? 'bg-indigo-600 text-white' : 'bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600/20'
        default: return 'bg-gray-600'
    }
}

/** Label affiche pour le provider. */
export function getProviderLabel(p: LoginProvider): string {
    switch (p) {
        case 'emby': return 'Emby'
        case 'plex': return 'Plex'
        case 'jellyfin': return 'Jellyfin'
        case 'local': return 'Local'
    }
}

/** Icone associee au provider. */
export function getProviderIcon(p: LoginProvider): ReactNode {
    switch (p) {
        case 'emby': return <Server className="h-5 w-5 text-gray-400" />
        case 'plex': return <Tv className="h-5 w-5 text-gray-400" />
        case 'jellyfin': return <MonitorPlay className="h-5 w-5 text-gray-400" />
        case 'local': return <UserCircle className="h-5 w-5 text-gray-400" />
    }
}

/** Classes du bouton submit selon le provider. */
export function getProviderSubmitClasses(p: LoginProvider): string {
    switch (p) {
        case 'emby': return 'bg-green-600 hover:bg-green-500 shadow-green-500/20 focus:ring-green-500'
        case 'plex': return 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20 focus:ring-amber-500'
        case 'jellyfin': return 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20 focus:ring-purple-500'
        case 'local': return 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 focus:ring-indigo-500'
    }
}
