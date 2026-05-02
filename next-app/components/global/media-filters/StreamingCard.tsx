'use client'

import { Check, ChevronDown, ChevronUp, Monitor } from 'lucide-react'
import clsx from 'clsx'
import {
  PROVIDER_PREVIEW_LIMIT,
  REGIONS,
} from './_constants/media-filters-options'
import type { WatchProvider } from './_types/media-filters'

interface StreamingCardProps {
  region: string
  onRegionChange: (value: string) => void
  providers: WatchProvider[]
  loadingProviders: boolean
  selectedProviders: number[]
  onToggleProvider: (id: number) => void
  showAllProviders: boolean
  onToggleShowAllProviders: () => void
}

export function StreamingCard({
  region,
  onRegionChange,
  providers,
  loadingProviders,
  selectedProviders = [],
  onToggleProvider,
  showAllProviders,
  onToggleShowAllProviders,
}: StreamingCardProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-indigo-400 mb-2">
        <Monitor className="h-4 w-4" />
        <h4 className="font-bold text-white">Streaming</h4>
      </div>
      <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-sm space-y-5 backdrop-blur-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase px-1">
            Région
          </label>
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full bg-gray-900 border-gray-700 rounded-2xl text-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
          >
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {loadingProviders ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            <p className="text-xs text-gray-500 animate-pulse">
              Chargement des services...
            </p>
          </div>
        ) : providers.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(showAllProviders
                ? providers
                : providers.slice(0, PROVIDER_PREVIEW_LIMIT)
              ).map((provider) => {
                const isSelected = selectedProviders.includes(
                  provider.provider_id
                )
                return (
                  <button
                    key={provider.provider_id}
                    onClick={() => onToggleProvider(provider.provider_id)}
                    className={clsx(
                      'relative aspect-square rounded-2xl p-1.5 transition-all border group overflow-hidden',
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/50'
                        : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                    )}
                    title={provider.provider_name}
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                      alt={provider.provider_name}
                      className="w-full h-full object-contain rounded-xl"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-indigo-500 rounded-full p-1 shadow-lg border border-white/20">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            {providers.length > PROVIDER_PREVIEW_LIMIT && (
              <button
                onClick={onToggleShowAllProviders}
                className="w-full py-3 bg-gray-900/50 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/5 flex items-center justify-center gap-2 transition-all border border-gray-800/50 hover:border-indigo-500/30"
              >
                {showAllProviders
                  ? 'Voir moins'
                  : `+ ${providers.length - PROVIDER_PREVIEW_LIMIT} autres services`}
                {showAllProviders ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700">
            <Monitor className="h-8 w-8 text-gray-700" />
            <p className="text-xs text-gray-500 font-medium">
              Aucun service de streaming disponible pour cette région.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
