'use client'

import { useEffect, useState } from 'react'
import { fetchUserProfileStats } from '../../actions'
import { 
  Users, Play, Clock, Calendar, 
  ChevronLeft, History, BarChart3, 
  Film, Tv, ArrowLeft, TrendingUp
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function UserProfilePage() {
  const params = useParams()
  const embyUserId = params.id as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const stats = await fetchUserProfileStats(embyUserId)
      setData(stats)
      setLoading(false)
    }
    load()

    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [embyUserId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 animate-pulse text-sm">Chargement de votre profil Stats.fm...</p>
      </div>
    )
  }

  if (!data || embyUserId === 'undefined') {
    return (
      <div className="text-center py-20 bg-gray-800/20 rounded-2xl border border-gray-700/30 max-w-2xl mx-auto">
        <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <Users className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Oups ! Session expirée</h2>
        <p className="text-gray-400 mb-8 px-10">
          Pour des raisons de sécurité, nous avons besoin que vous vous reconnectiez pour synchroniser vos identifiants Emby avec vos statistiques.
        </p>
        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Se reconnecter
        </button>
      </div>
    )
  }

  const { user, stats, topSeries, topItems, recentHistory, hourlyActivity } = data

  return (
    <div className="space-y-8 pb-10">
      {/* Header Profil */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gray-800/40 p-8 rounded-2xl border border-gray-700/50">
        <div className="relative">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-indigo-500/30">
            {user.image ? (
              <Image src={user.image} alt={user.name} width={128} height={128} className="object-cover" />
            ) : (
              <Users className="w-12 h-12 text-gray-500" />
            )}
          </div>
          <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-gray-800 ${user.isOnline ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`} />
        </div>
        
        <div className="text-center md:text-left space-y-2 flex-1">
          <Link href="/dashboard/stats" className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 mb-2">
            <ChevronLeft className="w-4 h-4" /> Retour
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white">{user.name}</h1>
          <p className="text-gray-400 text-sm flex items-center justify-center md:justify-start gap-2">
            <Clock className="w-4 h-4" /> Dernière activité : {user.lastSeen ? new Date(user.lastSeen).toLocaleDateString() : 'Jamais'}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          <StatCard icon={<Clock className="text-indigo-400" />} label="Temps total" value={`${Math.round(stats.totalMinutes / 60)}h`} />
          <StatCard icon={<Tv className="text-purple-400" />} label="Épisodes" value={stats.episodeCount} />
          <StatCard icon={<Film className="text-pink-400" />} label="Films" value={stats.movieCount} />
          <StatCard icon={<Calendar className="text-orange-400" />} label="Jours actifs" value={stats.daysActive} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne Gauche: Top Contenu */}
        <div className="lg:col-span-2 space-y-8">
          {/* Top Séries */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-semibold text-indigo-400">
              <TrendingUp className="w-6 h-6" />
              <h2>Séries les plus regardées</h2>
            </div>
            <div className="grid gap-3">
              {topSeries.map((s: any, i: number) => (
                <div key={i} className="bg-gray-800/50 border border-gray-700 p-4 rounded-xl flex items-center justify-between group hover:bg-gray-700/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-black text-gray-700 group-hover:text-indigo-500/50 transition-colors w-8">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-white text-lg">{s.name}</p>
                      <p className="text-sm text-gray-500">{s.count} épisodes • {Math.round(s.minutes / 60)}h de visionnage</p>
                    </div>
                  </div>
                  <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden hidden md:block">
                    <div 
                      className="h-full bg-indigo-500" 
                      style={{ width: `${(s.minutes / topSeries[0].minutes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top Items Individuels (Tableau) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-semibold text-purple-400">
              <BarChart3 className="w-6 h-6" />
              <h2>Top Médias Individuels</h2>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-800/80 text-gray-400 uppercase text-[10px] tracking-widest">
                    <th className="px-6 py-4">Média</th>
                    <th className="px-6 py-4 text-center">Vues</th>
                    <th className="px-6 py-4 text-right">Durée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {topItems.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-700/30">
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{item.name}</span>
                        <span className="ml-2 px-1.5 py-0.5 bg-gray-700 text-gray-400 text-[10px] rounded uppercase">{item.type}</span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-300">{item.count}</td>
                      <td className="px-6 py-4 text-right text-gray-300">{Math.round(item.minutes / 60)}h {item.minutes % 60}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Colonne Droite: Historique & Activité */}
        <div className="space-y-8">
          {/* Activité horaire */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-semibold text-pink-400">
              <BarChart3 className="w-6 h-6" />
              <h2>Habitudes d'écoute</h2>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-xl space-y-4">
              <p className="text-xs text-gray-400 uppercase tracking-widest text-center">Activité par heure</p>
              <div className="flex items-end justify-between h-32 gap-1">
                {hourlyActivity.map((count: number, h: number) => (
                  <div 
                    key={h} 
                    className="flex-1 bg-indigo-500/40 hover:bg-indigo-500 rounded-t-sm transition-all relative group"
                    style={{ height: `${Math.max((count / Math.max(...hourlyActivity)) * 100, 5)}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {h}h: {count}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 px-1">
                <span>00h</span>
                <span>06h</span>
                <span>12h</span>
                <span>18h</span>
                <span>23h</span>
              </div>
            </div>
          </section>

          {/* Historique Récent */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-semibold text-orange-400">
              <History className="w-6 h-6" />
              <h2>Historique récent</h2>
            </div>
            <div className="space-y-3">
              {recentHistory.map((h: any, i: number) => (
                <div key={i} className="bg-gray-800/30 border border-gray-700/50 p-3 rounded-lg flex gap-3 items-start hover:border-indigo-500/30 transition-colors">
                  <div className="mt-1">
                    {h.type === 'Episode' ? <Tv className="w-4 h-4 text-indigo-400" /> : <Film className="w-4 h-4 text-pink-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{h.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {h.seriesName && `${h.seriesName} • `}
                      {new Date(h.playedAt).toLocaleDateString()} à {new Date(h.playedAt).getHours()}h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: any, label: string, value: any }) {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 p-4 rounded-xl flex flex-col items-center justify-center text-center">
      <div className="p-2 bg-gray-900/50 rounded-lg mb-2">
        {icon}
      </div>
      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  )
}
