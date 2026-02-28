import { useState, useEffect } from 'react'
import { X, Cpu, Activity, HardDrive, Network, Server } from 'lucide-react'
import clsx from 'clsx'

interface DockerContainer {
  id: string
  name: string
  image: string
  state: string
  status: string
  ports?: string
  autoStart: boolean
  icon?: string
}

interface ContainerStatsProps {
  container: DockerContainer
  onClose: () => void
  canReadDetails?: boolean
}

interface StatsData {
  cpu: number
  memory: {
    used: number
    limit: number
    percent: number
  }
  network: {
    rx: number
    tx: number
  }
  pids: number
}

export default function ContainerStats({ container, onClose, canReadDetails = false }: ContainerStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (!canReadDetails) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#0A0A0A]/95 backdrop-blur-xl border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl ring-1 ring-red-500/10" onClick={e => e.stopPropagation()}>
                <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10">
                    <Activity className="w-8 h-8 text-red-500" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight mb-2">Accès Refusé</h2>
                    <p className="text-gray-400 font-medium">Vous n'avez pas la permission de voir les statistiques de ce conteneur.</p>
                </div>
                <button 
                    onClick={onClose}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all w-full border border-white/5 hover:border-white/10"
                >
                    Fermer
                </button>
            </div>
        </div>
    )
  }

  useEffect(() => {
    let isMounted = true
    
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/docker/${container.id}/stats`)
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        if (isMounted) {
            setStats(data.stats)
            setLoading(false)
        }
      } catch (err) {
        console.error(err)
        if (isMounted) {
            // Don't show error immediately on first poll failure if we have data? 
            // Actually, just keep old data if update fails
            if (!stats) setError('Impossible de charger les statistiques')
        }
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 2000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [container.id])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative ring-1 ring-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 pointer-events-none" />

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center shadow-lg shadow-blue-500/10">
                {container.icon ? (
                    <img src={container.icon} alt={container.name} className="w-8 h-8 object-contain drop-shadow-md" />
                ) : (
                    <Server className="w-7 h-7 text-blue-400" />
                )}
             </div>
             <div>
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                    {container.name}
                </h2>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className={clsx(
                        "w-2.5 h-2.5 rounded-full shadow-sm",
                        container.state === 'RUNNING' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    )} />
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{container.status}</p>
                </div>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95 hover:rotate-90 duration-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 relative z-10">
            {loading && !stats ? (
                <div className="flex flex-col items-center justify-center py-16 gap-5">
                    <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-bold animate-pulse">Connexion au conteneur...</p>
                </div>
            ) : error ? (
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center backdrop-blur-md">
                    <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">{error}</p>
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CPU */}
                    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/20">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 duration-500 rotate-12">
                            <Cpu className="w-24 h-24 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                <Cpu className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-xs">Processeur</span>
                        </div>
                        <div className="flex items-end gap-2 relative z-10">
                            <span className="text-4xl font-black text-white tracking-tighter filter drop-shadow-lg">{stats.cpu.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-black/40 h-3 rounded-full mt-6 overflow-hidden border border-white/5 ring-1 ring-white/5">
                            <div 
                                className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500 relative shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                style={{ width: `${Math.min(stats.cpu, 100)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    </div>

                    {/* RAM */}
                    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-500/20">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 duration-500 -rotate-12">
                            <Activity className="w-24 h-24 text-purple-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                <Activity className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-xs">Mémoire RAM</span>
                        </div>
                        <div className="flex items-end gap-3 relative z-10">
                            <span className="text-4xl font-black text-white tracking-tighter filter drop-shadow-lg">{formatBytes(stats.memory.used)}</span>
                            <span className="text-sm text-gray-500 font-bold mb-1.5">/ {formatBytes(stats.memory.limit)}</span>
                        </div>
                        <div className="w-full bg-black/40 h-3 rounded-full mt-6 overflow-hidden border border-white/5 ring-1 ring-white/5">
                            <div 
                                className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500 relative shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                                style={{ width: `${Math.min(stats.memory.percent, 100)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                            </div>
                        </div>
                    </div>

                    {/* Network */}
                    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group md:col-span-2 hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-500/20">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 duration-500 rotate-6">
                            <Network className="w-32 h-32 text-emerald-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                <Network className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-gray-400 font-bold uppercase tracking-wider text-xs">Réseau (Total)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-12 relative z-10">
                            <div className="space-y-2 group/item">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center gap-2 group-hover/item:text-emerald-400 transition-colors">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                    Téléchargé (RX)
                                </span>
                                <div className="text-3xl font-black text-white tracking-tight filter drop-shadow-lg">{formatBytes(stats.network.rx)}</div>
                            </div>
                            <div className="space-y-2 group/item">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold flex items-center gap-2 group-hover/item:text-blue-400 transition-colors">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                    Envoyé (TX)
                                </span>
                                <div className="text-3xl font-black text-white tracking-tight filter drop-shadow-lg">{formatBytes(stats.network.tx)}</div>
                            </div>
                        </div>
                    </div>

                    {/* PIDs */}
                    <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/5 relative overflow-hidden group md:col-span-2 hover:bg-white/[0.03] transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl hover:shadow-orange-500/10 hover:border-orange-500/20">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all transform group-hover:scale-110 duration-500 -rotate-6">
                            <HardDrive className="w-32 h-32 text-orange-500" />
                        </div>
                         <div className="flex items-center gap-4 relative z-10">
                            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20 group-hover:bg-orange-500/20 transition-colors">
                                <HardDrive className="w-8 h-8 text-orange-400" />
                            </div>
                            <div>
                                <span className="text-gray-400 font-bold uppercase tracking-wider text-xs block mb-1">Processus (PIDs)</span>
                                <span className="text-4xl font-black text-white tracking-tight filter drop-shadow-lg">{stats.pids}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
      </div>
    </div>
  )
}
