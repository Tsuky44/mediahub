'use client'

import { Eye } from 'lucide-react'
import type { ItemDetails } from '../../../_types/storage'
import { formatLastPlayed } from '../../../_utils/storage-formatters'

interface UserActivitySectionProps {
  details: ItemDetails
}

export function UserActivitySection({ details }: UserActivitySectionProps) {
  if (details.viewingStats.length === 0) {
    return (
      <div className="space-y-4">
        <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
          <Eye size={16} />
          Activité des utilisateurs
        </h4>
        <div className="text-gray-500 italic text-sm p-4 bg-white/5 rounded-lg text-center">
          Aucune activité récente détectée.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
        <Eye size={16} />
        Activité des utilisateurs
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {details.viewingStats.map(stat => {
          // Un média marqué "Vu" doit afficher une progression à 100%.
          const displayPercentage = stat.played ? 100 : stat.percentage
          return (
          <div
            key={stat.userId}
            className="bg-white/5 rounded-lg p-3 flex items-center gap-3 border border-white/5"
          >
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
              {stat.userName.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-white truncate">{stat.userName}</span>
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  {stat.totalEpisodes !== undefined && (
                    <span>
                      {stat.playedEpisodes}/{stat.totalEpisodes} eps
                    </span>
                  )}
                  <span className="font-medium text-white">{Math.round(displayPercentage)}%</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${stat.played ? 'bg-green-500' : 'bg-purple-500'}`}
                  style={{ width: `${displayPercentage}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500 flex justify-between items-center">
                <span
                  className="truncate mr-2 flex-1"
                  title={stat.episodeText || (stat.played ? 'Vu' : 'En cours')}
                >
                  {stat.episodeText || (stat.played ? 'Vu' : 'En cours')}
                </span>
                <span
                  className="whitespace-nowrap ml-2"
                  title={
                    stat.lastPlayedDate
                      ? new Date(stat.lastPlayedDate).toLocaleString('fr-FR')
                      : 'Date de dernière lecture'
                  }
                >
                  {formatLastPlayed(stat.lastPlayedDate)}
                </span>
              </div>

              {stat.seasons && stat.seasons.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/5">
                  <div className="flex flex-wrap gap-2">
                    {stat.seasons.map(s => (
                      <div
                        key={s.seasonNumber}
                        className="text-[10px] text-gray-400 text-center bg-black/20 rounded p-1.5 min-w-[3rem] flex-1 max-w-[4rem]"
                        title={`${s.played}/${s.total} épisodes vus`}
                      >
                        <div className="mb-0.5 font-medium text-gray-300">S{s.seasonNumber}</div>
                        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full ${s.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${s.percentage}%` }}
                          />
                        </div>
                        <div>{Math.round(s.percentage)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
