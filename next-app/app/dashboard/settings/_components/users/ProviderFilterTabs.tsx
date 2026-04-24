'use client'

import type { ProviderFilter } from '../../_types/user'

const PROVIDERS: { id: ProviderFilter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'emby', label: 'Emby' },
    { id: 'plex', label: 'Plex' },
    { id: 'jellyfin', label: 'Jellyfin' },
    { id: 'local', label: 'Local' },
]

interface ProviderFilterTabsProps {
    value: ProviderFilter
    onChange: (value: ProviderFilter) => void
}

export function ProviderFilterTabs({ value, onChange }: ProviderFilterTabsProps) {
    return (
        <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
            {PROVIDERS.map(provider => (
                <button
                    key={provider.id}
                    onClick={() => onChange(provider.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        value === provider.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {provider.label}
                </button>
            ))}
        </div>
    )
}
