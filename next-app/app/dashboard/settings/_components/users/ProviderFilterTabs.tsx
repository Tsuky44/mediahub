'use client'

import { BRAND, ONYX_BRAND, isMediaServerBrand } from '@/lib/media-server-brand'
import type { ProviderFilter } from '../../_types/user'

const PROVIDERS: { id: ProviderFilter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'emby', label: 'Emby' },
    { id: 'plex', label: 'Plex' },
    { id: 'jellyfin', label: 'Jellyfin' },
    { id: 'onyx', label: 'Onyx' },
    { id: 'local', label: 'Local' },
]

interface ProviderFilterTabsProps {
    value: ProviderFilter
    onChange: (value: ProviderFilter) => void
}

export function ProviderFilterTabs({ value, onChange }: ProviderFilterTabsProps) {
    return (
        <div className="flex max-w-full gap-1 overflow-x-auto bg-black/20 p-1 rounded-lg [&>button]:min-h-9 [&>button]:shrink-0 max-sm:[&>button]:flex-1 max-sm:[&>button]:px-2">
            {PROVIDERS.map(provider => (
                <button
                    key={provider.id}
                    onClick={() => onChange(provider.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        value !== provider.id
                            ? 'text-gray-400 hover:text-white hover:bg-white/5'
                            : isMediaServerBrand(provider.id)
                              ? BRAND[provider.id].selected
                              : provider.id === 'onyx'
                              ? ONYX_BRAND.selected
                              : 'bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]'
                    }`}
                >
                    {provider.label}
                </button>
            ))}
        </div>
    )
}
