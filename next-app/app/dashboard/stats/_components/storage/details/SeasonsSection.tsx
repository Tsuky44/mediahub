'use client'

import { Tv, Trash2 } from 'lucide-react'
import type { ItemDetails, SeasonDetail } from '../../../_types/storage'
import { formatBytes } from '../../../_utils/storage-formatters'

interface SeasonsSectionProps {
  seasons: ItemDetails['seasons']
  canDelete: boolean
  onDeleteSeason: (season: SeasonDetail) => void
}

export function SeasonsSection({ seasons, canDelete, onDeleteSeason }: SeasonsSectionProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
        <Tv size={16} />
        Saisons ({seasons.length})
      </h4>
      <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
        {/* Desktop Table */}
        <table className="hidden md:table w-full text-left text-sm">
          <thead className="bg-black/20 text-gray-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium text-right">Épisodes</th>
              <th className="px-4 py-3 font-medium text-right">Taille</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {seasons.map(season => (
              <tr key={season.id} className="hover:bg-white/5">
                <td className="px-4 py-3 text-white">{season.name}</td>
                <td className="px-4 py-3 text-right text-gray-400">{season.episodesCount}</td>
                <td className="px-4 py-3 text-right text-gray-300 font-mono">{formatBytes(season.size)}</td>
                <td className="px-4 py-3 text-right">
                  {canDelete && (
                    <button
                      onClick={() => onDeleteSeason(season)}
                      className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"
                      title="Supprimer la saison"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile List */}
        <div className="md:hidden divide-y divide-white/5">
          {seasons.map(season => (
            <div key={season.id} className="p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-white font-medium">{season.name}</div>
                <div className="text-xs text-gray-400 flex gap-2">
                  <span>{season.episodesCount} épisodes</span>
                  <span>•</span>
                  <span className="font-mono">{formatBytes(season.size)}</span>
                </div>
              </div>
              {canDelete && (
                <button
                  onClick={() => onDeleteSeason(season)}
                  className="text-gray-500 hover:text-red-400 p-2 rounded transition-colors"
                  title="Supprimer la saison"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
