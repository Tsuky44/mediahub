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

export default function ContainerStats({ container, onClose }: ContainerStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[#0F172A] border border-gray-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                {container.icon ? (
                    <img src={container.icon} alt={container.name} className="w-8 h-8 object-contain" />
                ) : (
                    <Server className="w-6 h-6 text-blue-400" />
                )}
             </div>
             <div>
                <h2 className="text-xl font-black text-white tracking-tight">{container.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className={clsx(
                        "w-2 h-2 rounded-full",
                        container.state === 'RUNNING' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
                    )} />
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{container.status}</p>
                </div>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-all active:scale-90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
            {loading && !stats ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Connexion au conteneur...</p>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center">
                    {error}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CPU */}
                    <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Cpu className="w-16 h-16 text-blue-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Cpu className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-gray-400 font-medium">Processeur</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-white tracking-tight">{stats.cpu.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-gray-700/50 h-2 rounded-full mt-4 overflow-hidden">
                            <div 
                                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(stats.cpu, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* RAM */}
                    <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Activity className="w-16 h-16 text-purple-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Activity className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-gray-400 font-medium">Mémoire RAM</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-white tracking-tight">{formatBytes(stats.memory.used)}</span>
                            <span className="text-sm text-gray-500 font-medium mb-1">/ {formatBytes(stats.memory.limit)}</span>
                        </div>
                        <div className="w-full bg-gray-700/50 h-2 rounded-full mt-4 overflow-hidden">
                            <div 
                                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(stats.memory.percent, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Network */}
                    <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30 relative overflow-hidden group md:col-span-2">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Network className="w-16 h-16 text-green-500" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <Network className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-gray-400 font-medium">Réseau (Total)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Téléchargé (RX)</span>
                                <div className="text-2xl font-black text-white mt-1">{formatBytes(stats.network.rx)}</div>
                            </div>
                            <div>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Envoyé (TX)</span>
                                <div className="text-2xl font-black text-white mt-1">{formatBytes(stats.network.tx)}</div>
                            </div>
                        </div>
                    </div>

                    {/* PIDs */}
                    <div className="bg-gray-800/30 rounded-2xl p-5 border border-gray-700/30 relative overflow-hidden group md:col-span-2">
                         <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <HardDrive className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <span className="text-gray-400 font-medium block">Processus (PIDs)</span>
                                <span className="text-xl font-bold text-white">{stats.pids}</span>
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
