import { Server, Tv, MonitorPlay, UserCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { BRAND, isMediaServerBrand } from '@/lib/media-server-brand'

export type LoginProvider = 'emby' | 'plex' | 'jellyfin' | 'local'

export interface EnabledProviders {
    emby: boolean
    plex: boolean
    jellyfin: boolean
    local: boolean
}

/** Determine le provider par defaut selon ceux actives. */
export function getDefaultProvider(enabled: EnabledProviders): LoginProvider {
    if (enabled.emby) return 'emby'
    if (enabled.jellyfin) return 'jellyfin'
    if (enabled.plex) return 'plex'
    if (enabled.local) return 'local'
    return 'local'
}

/** Bouton de provider : choisi, il prend la couleur de son serveur (verre éclairé pour Local). */
export function getProviderColor(p: LoginProvider, active: boolean): string {
    if (!active) return 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
    return isMediaServerBrand(p) ? BRAND[p].selected : 'bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]'
}

/** Bouton de connexion : couleur du serveur choisi (verre éclairé pour Local). */
export function getSubmitColor(p: LoginProvider): string {
    return isMediaServerBrand(p)
        ? `border-transparent ${BRAND[p].solid}`
        : 'border-white/20 bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] hover:bg-white/20'
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
        case 'emby': return <Server className={`h-5 w-5 ${BRAND.emby.text}`} />
        case 'plex': return <Tv className={`h-5 w-5 ${BRAND.plex.text}`} />
        case 'jellyfin': return <MonitorPlay className={`h-5 w-5 ${BRAND.jellyfin.text}`} />
        case 'local': return <UserCircle className="h-5 w-5 text-gray-400" />
    }
}
