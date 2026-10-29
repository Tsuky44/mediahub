'use client'

import clsx from 'clsx'
import { Server, Tv, MonitorPlay, UserCircle, Play } from 'lucide-react'
import { getProviderColor, type EnabledProviders, type LoginProvider } from '../_utils/login-providers'

const PROVIDER_OPTIONS: Array<{ id: LoginProvider; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'local', label: 'Local', Icon: UserCircle },
    { id: 'emby', label: 'Emby', Icon: Server },
    { id: 'plex', label: 'Plex', Icon: Tv },
    { id: 'jellyfin', label: 'Jellyfin', Icon: MonitorPlay },
    { id: 'onyx', label: 'Onyx', Icon: Play },
]

interface ProviderSelectorProps {
    enabled: EnabledProviders
    current: LoginProvider
    onChange: (p: LoginProvider) => void
}

/** Grille de selection du provider d'authentification. */
export function ProviderSelector({ enabled, current, onChange }: ProviderSelectorProps) {
    const options = PROVIDER_OPTIONS.filter(opt => enabled[opt.id])
    return (
        <div
            className="grid gap-2 mb-8 p-1 bg-black/25 border border-white/5 rounded-2xl"
            style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 5)}, minmax(0, 1fr))` }}
        >
            {options.map(({ id, label, Icon }) => (
                <button
                    key={id}
                    type="button"
                    onClick={() => onChange(id)}
                    className={clsx(
                        'flex flex-col items-center justify-center p-3 rounded-xl transition-colors duration-300 ease-onyx',
                        getProviderColor(current === id),
                    )}
                >
                    <Icon className="w-6 h-6 mb-1" />
                    <span className="text-xs font-medium">{label}</span>
                </button>
            ))}
        </div>
    )
}
