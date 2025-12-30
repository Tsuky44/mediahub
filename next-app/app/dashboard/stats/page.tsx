'use client'

import { fetchAdvancedStats } from './actions'
import { Users, Play, Clock, Activity, Monitor, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadStats = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true)
    try {
      const data = await fetchAdvancedStats()
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
    // Rafraîchir toutes les 30 secondes pour le "temps réel"
    const interval = setInterval(() => loadStats(true), 30000)
    return () => clearInterval(interval)
  }, [loadStats])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Statistiques du Serveur</h1>
          <p className="text-gray-400">Aperçu de l'activité en temps réel et historique du mois.</p>
        </div>
        <div className="flex items-center gap-2">
          {isRefreshing && <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />}
          <button 
            onClick={() => loadStats(true)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'opacity-0' : ''}`} />
          </button>
        </div>
      </div>

      {/* Temps Réel */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-xl font-semibold text-indigo-400">
          <Activity className="w-6 h-6" />
          <h2>En direct</h2>
        </div>
        
        {stats?.live?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.live.map((session: any, i: number) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-white">{session.userName}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> {session.deviceId}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase rounded-full border border-green-500/20">
                    Lecture
                  </span>
                </div>
                
                <div>
                  <p className="text-sm text-gray-300 line-clamp-1">
                    {session.itemType === 'Episode' && session.seriesName ? (
                      <span className="text-indigo-400 font-semibold">{session.seriesName} - </span>
                    ) : null}
                    {session.itemName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.itemType === 'Episode' ? (
                      <span>Saison {session.seasonNumber} • Épisode {session.episodeNumber}</span>
                    ) : (
                      session.itemType
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-500" 
                      style={{ width: `${session.percentDone}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-gray-500">{session.percentDone}% terminé</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800/30 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
            Personne ne regarde rien pour le moment.
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Médias du mois */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xl font-semibold text-purple-400">
            <Play className="w-6 h-6" />
            <h2>Top Médias (30j)</h2>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-800/80 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium">Média</th>
                  <th className="px-4 py-3 font-medium text-center">Vues</th>
                  <th className="px-4 py-3 font-medium text-right">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats?.topItems?.map((item: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-white line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-300">
                      {item.type === 'Série' ? `${item.plays} épisodes` : `${item.plays} vues`}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-300">
                      {Math.round(item.minutes / 60)}h {item.minutes % 60}m
                    </td>
                  </tr>
                ))}
                {(!stats?.topItems || stats.topItems.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                      Aucune donnée pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Utilisateurs les plus actifs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-xl font-semibold text-pink-400">
            <Users className="w-6 h-6" />
            <h2>Top Utilisateurs (30j)</h2>
          </div>
          <div className="space-y-3">
            {stats?.topUsers?.map((user: any, i: number) => (
              <Link 
                key={i} 
                href={`/dashboard/stats/user/${user.embyUserId}`}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between hover:bg-gray-700/50 hover:border-indigo-500/30 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-600 group-hover:border-indigo-500/50 transition-colors">
                    {user.image ? (
                      <Image src={user.image} alt={user.name} width={48} height={48} />
                    ) : (
                      <Users className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-1">
                    <p className="text-base font-semibold text-white whitespace-nowrap group-hover:text-indigo-400 transition-colors">{user.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                        <Play className="w-3 h-3 text-indigo-400" />
                        <span className="text-xs font-medium text-indigo-300">{user.episodeCount} épisodes</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                        <Monitor className="w-3 h-3 text-purple-400" />
                        <span className="text-xs font-medium text-purple-300">{user.movieCount} films</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-400 group-hover:scale-110 transition-transform">{Math.round(user.totalMinutes / 60)}h</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Temps total</p>
                </div>
              </Link>
            ))}
            {(!stats?.topUsers || stats.topUsers.length === 0) && (
              <div className="bg-gray-800/30 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
                Aucune donnée pour le moment.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
