'use client'

import { UserPlus } from 'lucide-react'
import type { SyncProvider } from '../../_types/user'

interface UserSyncButtonsProps {
    syncingProvider: SyncProvider | null
    readOnly: boolean
    onSync: (provider: SyncProvider) => void
    onOpenCreate: () => void
}

interface SyncButtonConfig {
    provider: SyncProvider
    label: string
    className: string
}

const SYNC_BUTTONS: SyncButtonConfig[] = [
    { provider: 'emby', label: 'Sync Emby', className: 'bg-green-600 hover:bg-green-500' },
    { provider: 'plex', label: 'Sync Plex', className: 'bg-orange-600 hover:bg-orange-500' },
    { provider: 'jellyfin', label: 'Sync Jellyfin', className: 'bg-purple-600 hover:bg-purple-500' },
]

/**
 * Groupe de boutons : créer un utilisateur + synchroniser avec Emby/Plex/Jellyfin.
 */
export function UserSyncButtons({ syncingProvider, readOnly, onSync, onOpenCreate }: UserSyncButtonsProps) {
    return (
        <div className="flex gap-2">
            <button
                onClick={onOpenCreate}
                disabled={readOnly}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
                <UserPlus size={16} />
                <span>Créer</span>
            </button>
            {SYNC_BUTTONS.map(({ provider, label, className }) => (
                <button
                    key={provider}
                    onClick={() => onSync(provider)}
                    disabled={!!syncingProvider || readOnly}
                    className={`flex items-center gap-2 px-3 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm ${className}`}
                >
                    {syncingProvider === provider ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span>{label}</span>
                    )}
                </button>
            ))}
        </div>
    )
}
