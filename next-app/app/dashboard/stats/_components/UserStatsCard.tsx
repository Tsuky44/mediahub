'use client'

import React, { useState } from 'react'
import { User, X, Trophy } from 'lucide-react'

export interface UserStat {
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
        className="rounded-3xl bg-black/20 shadow-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:shadow-indigo-500/10 overflow-hidden relative ring-1 ring-white/5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Activité {periodLabel}</span>
            <div className="p-2 bg-yellow-500/10 rounded-full group-hover:bg-yellow-500/20 transition-colors">
              <Trophy className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>
          
          <div className="space-y-4">
            {topUsers.length > 0 ? (
              topUsers.map((user, idx) => (
                <div key={user.name} className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm transition-transform group-hover/item:scale-110 ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-yellow-500/20' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-gray-400/20' :
                      'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/20'
                    }`}>
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-200 group-hover/item:text-white transition-colors truncate">{user.name}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-sm font-bold text-white whitespace-nowrap tabular-nums">{formatDuration(user.duration)}</span>
                    {user.plays !== undefined && <span className="text-[10px] text-gray-500 group-hover/item:text-indigo-400 transition-colors">{user.plays} sessions</span>}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 py-4 text-center italic">Aucune activité enregistrée</div>
            )}
          </div>
          
          <div className="mt-6 pt-4 border-t border-white/5 flex justify-center">
            <span className="text-xs text-indigo-400 font-semibold group-hover:text-indigo-300 transition-colors uppercase tracking-wider flex items-center gap-1">
              Voir le classement complet
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-[#080909]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200 ring-1 ring-white/10">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Classement des Utilisateurs
                </h3>
                <p className="text-sm text-gray-400 mt-1">Temps de lecture total ({periodLabel})</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-0 custom-scrollbar bg-gray-900/30">
              <div className="grid grid-cols-1 gap-3 p-4">
                {allUsers.map((user, idx) => (
                  <div key={user.name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm hover:bg-white/10 transition-all duration-300 group/list">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                        idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-yellow-500/20' :
                        idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-gray-400/20' :
                        idx === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-orange-500/20' :
                        'bg-black/40 text-gray-400 border border-white/10'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-base font-semibold text-white truncate group-hover/list:text-indigo-200 transition-colors">{user.name}</span>
                        {user.plays !== undefined && <span className="text-xs text-gray-500">{user.plays} sessions</span>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-white whitespace-nowrap bg-black/40 px-3 py-1.5 rounded-full border border-white/5 tabular-nums">
                      {formatDuration(user.duration)}
                    </span>
                  </div>
                ))}
              </div>

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
