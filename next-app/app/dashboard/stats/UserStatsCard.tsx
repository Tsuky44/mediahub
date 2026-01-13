'use client'

import React, { useState } from 'react'
import { User, X, Trophy } from 'lucide-react'

interface UserStat {
  name: string
  duration: number
  plays?: number
}

interface UserStatsCardProps {
  topUsers: UserStat[]
  allUsers: UserStat[]
  periodLabel: string
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function UserStatsCard({ topUsers, allUsers, periodLabel }: UserStatsCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-gray-800 p-6 shadow-sm border border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-400">Activité {periodLabel}</span>
          <Trophy className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
        </div>
        
        <div className="space-y-3">
          {topUsers.length > 0 ? (
            topUsers.map((user, idx) => (
              <div key={user.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                    idx === 1 ? 'bg-gray-300/20 text-gray-300' :
                    'bg-orange-500/20 text-orange-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-white truncate">{user.name}</span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-sm font-bold text-white whitespace-nowrap">{formatDuration(user.duration)}</span>
                  {user.plays !== undefined && <span className="text-[10px] text-gray-500">{user.plays} sessions</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 py-2">Aucune activité</div>
          )}
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-700/50 flex justify-center">
          <span className="text-[10px] text-blue-400 font-medium group-hover:underline uppercase tracking-wider">Voir tout le classement</span>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Classement des Utilisateurs</h3>
                <p className="text-sm text-gray-400">Temps de lecture total ({periodLabel})</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="px-4 py-3">Rang</th>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3 text-right">Temps Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {allUsers.map((user, idx) => (
                    <tr key={user.name} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                          idx === 1 ? 'bg-gray-300/20 text-gray-300' :
                          idx === 2 ? 'bg-orange-500/20 text-orange-500' :
                          'bg-gray-800 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-500" />
                          </div>
                          <span className="font-semibold text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-lg font-bold text-white">{formatDuration(user.duration)}</span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Visionnage {periodLabel}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allUsers.length === 0 && (
                <div className="text-center py-12">
                  <User className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun utilisateur trouvé</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
