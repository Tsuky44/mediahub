'use client'

import { useState, useEffect } from 'react'
import { getGlobalStats, getSessionTrackerStats, getTrackerHistory } from './actions'
import { ArrowDown, ArrowUp, Activity, Clock, Users, Globe, HardDrive, X, ExternalLink, BarChart3, Calendar, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TrackerStat {
    tracker: string
    uploaded: number
    downloaded: number
    count: number
}

interface HistoryStat {
    date: string
    stats: {
        tracker: string
        uploaded: number
        downloaded: number
    }[]
}

export function TorrentStats() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [trackerStats, setTrackerStats] = useState<TrackerStat[]>([])
    const [history, setHistory] = useState<HistoryStat[]>([])
    const [loadingTrackers, setLoadingTrackers] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [activeTab, setActiveTab] = useState<'session' | 'history'>('session')
    
    // Initialize dates: Start = 7 days ago, End = Today
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        const fetchStats = async () => {
            const data = await getGlobalStats()
            if (data) setStats(data)
            setLoading(false)
        }

        fetchStats()
        const interval = setInterval(fetchStats, 2000)
        return () => clearInterval(interval)
    }, [])

    // Fetch session stats when modal opens
    useEffect(() => {
        if (isModalOpen && activeTab === 'session') {
            const fetchSession = async () => {
                setLoadingTrackers(true)
                try {
                    const data = await getSessionTrackerStats()
                    setTrackerStats(data)
                } catch (e) {
                    console.error(e)
                }
                setLoadingTrackers(false)
            }
            fetchSession()
        }
    }, [isModalOpen, activeTab])

    // Fetch history stats when modal opens or dates change
    useEffect(() => {
        if (isModalOpen && activeTab === 'history') {
            const fetchHistoryData = async () => {
                setLoadingHistory(true)
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const data = await getTrackerHistory(startDate, endDate)
                    setHistory(data as any)
                } catch (e) {
                    console.error(e)
                }
                setLoadingHistory(false)
            }
            // Debounce slightly to avoid double fetch on rapid date change
            const timer = setTimeout(fetchHistoryData, 300)
            return () => clearTimeout(timer)
        }
    }, [isModalOpen, activeTab, startDate, endDate])

    const openModal = () => {
        setIsModalOpen(true)
        // Reset dates when opening if needed, or keep last selection
    }

    if (loading || !stats) return null

    const formatSpeed = (bytes: number) => {
        if (bytes === 0) return '0 o/s'
        const k = 1024
        const sizes = ['o/s', 'Ko/s', 'Mo/s', 'Go/s']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 o'
        const k = 1024
        const sizes = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatRatio = (ratio: number) => {
        return ratio.toFixed(2)
    }

    const globalRatio = stats.alltime_dl > 0 ? stats.alltime_ul / stats.alltime_dl : 0

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
                {/* Speed & Connections */}
                <div className="md:col-span-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vitesse & Connexions</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">DL</p>
                            <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                                <ArrowDown className="w-3 h-3 text-emerald-500" />
                                {formatSpeed(stats.dl_info_speed).split(' ')[0]} <span className="text-[9px] text-gray-500">{formatSpeed(stats.dl_info_speed).split(' ')[1]}</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">UP</p>
                            <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                                <ArrowUp className="w-3 h-3 text-blue-500" />
                                {formatSpeed(stats.up_info_speed).split(' ')[0]} <span className="text-[9px] text-gray-500">{formatSpeed(stats.up_info_speed).split(' ')[1]}</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Seeds</p>
                            <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                                <Users className="w-3 h-3 text-emerald-500" />
                                {stats.global_seeds || 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Leechs</p>
                            <p className="text-xs font-bold text-white font-mono flex items-center gap-1">
                                <Users className="w-3 h-3 text-blue-500" />
                                {stats.global_leechs || 0}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Session */}
                <button 
                    onClick={openModal}
                    className="md:col-span-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/10 hover:border-purple-500/30 transition-all group text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Session</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Téléchargé</p>
                            <p className="text-xs font-bold text-white font-mono">{formatSize(stats.dl_info_data)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Envoyé</p>
                            <p className="text-xs font-bold text-white font-mono">{formatSize(stats.up_info_data)}</p>
                        </div>
                    </div>
                </button>

                {/* Global Stats */}
                <div className="md:col-span-2 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Global</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Total DL</p>
                            <p className="text-xs font-bold text-white font-mono truncate">{formatSize(stats.alltime_dl)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Total UP</p>
                            <p className="text-xs font-bold text-white font-mono truncate">{formatSize(stats.alltime_ul)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Ratio</p>
                            <p className={`text-xs font-bold font-mono ${globalRatio < 1 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatRatio(globalRatio)}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 font-medium mb-0.5 truncate">Libre</p>
                            <p className="text-xs font-bold text-white font-mono flex items-center gap-1 truncate">
                                <HardDrive className="w-3 h-3 text-gray-400" />
                                {formatSize(stats.free_space_on_disk).split(' ')[0]}<span className="text-[9px] text-gray-500">{formatSize(stats.free_space_on_disk).split(' ')[1]}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="flex border-b border-white/5 relative">
                                <button 
                                    onClick={() => setActiveTab('session')}
                                    className={`flex-1 p-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'session' ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'}`}
                                >
                                    Session Actuelle
                                </button>
                                <button 
                                    onClick={() => setActiveTab('history')}
                                    className={`flex-1 p-4 text-sm font-bold transition-colors border-b-2 ${activeTab === 'history' ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'}`}
                                >
                                    Historique
                                </button>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {activeTab === 'history' && (
                                <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-4 overflow-x-auto custom-scrollbar">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Du</span>
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            max={endDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors font-mono color-scheme-dark"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                    <div className="w-px h-4 bg-white/10" />
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Au</span>
                                        <input 
                                            type="date" 
                                            value={endDate}
                                            min={startDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-colors font-mono color-scheme-dark"
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {loadingTrackers && activeTab === 'session' ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm text-gray-400 animate-pulse">Récupération des données...</p>
                                    </div>
                                ) : loadingHistory && activeTab === 'history' ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm text-gray-400 animate-pulse">Analyse de l'historique...</p>
                                    </div>
                                ) : activeTab === 'session' ? (
                                    trackerStats.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-3">
                                            {trackerStats.map((item, idx) => (
                                                <div key={idx} className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors group">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Globe className="w-4 h-4 text-blue-400" />
                                                            <span className="text-sm font-bold text-white truncate max-w-[250px]">{item.tracker}</span>
                                                        </div>
                                                        <span className="text-[10px] bg-white/5 px-2 py-1 rounded-lg text-gray-400">
                                                            {item.count} torrent{item.count > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-black/20 rounded-xl p-3">
                                                            <p className="text-[10px] text-gray-500 font-medium mb-1 uppercase tracking-wider">Téléchargé</p>
                                                            <div className="flex items-center gap-2">
                                                                <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                                                                <span className="text-sm font-bold text-white font-mono">{formatSize(item.downloaded)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-black/20 rounded-xl p-3">
                                                            <p className="text-[10px] text-gray-500 font-medium mb-1 uppercase tracking-wider">Envoyé</p>
                                                            <div className="flex items-center gap-2">
                                                                <ArrowUp className="w-3.5 h-3.5 text-blue-500" />
                                                                <span className="text-sm font-bold text-white font-mono">{formatSize(item.uploaded)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-purple-500/50" 
                                                            style={{ 
                                                                width: `${Math.min(100, (item.uploaded / (item.downloaded || 1)) * 100)}%` 
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                            <Activity className="w-8 h-8 text-gray-600" />
                                        </div>
                                        <p className="text-gray-400">Aucune donnée de session disponible pour le moment.</p>
                                    </div>
                                )
                                ) : (
                                    history.length > 0 ? (
                                        <div className="space-y-8">
                                            {history.map((day, idx) => (
                                                <div key={idx} className="space-y-3">
                                                    <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2 sticky top-0 bg-[#0f172a] py-2 z-10 border-b border-white/5">
                                                        <Calendar className="w-4 h-4 text-purple-400" />
                                                        <span className="capitalize">
                                                            {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                                        </span>
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {day.stats.map((stat, sIdx) => (
                                                            <div key={sIdx} className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="p-1.5 bg-black/20 rounded-lg">
                                                                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                                                                    </div>
                                                                    <span className="text-sm font-bold text-white truncate max-w-[150px] md:max-w-[200px]">{stat.tracker}</span>
                                                                </div>
                                                                <div className="flex items-center gap-4 text-xs font-mono">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <ArrowDown className="w-3 h-3 text-emerald-500" />
                                                                        <span className="text-gray-300">{formatSize(stat.downloaded)}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <ArrowUp className="w-3 h-3 text-blue-500" />
                                                                        <span className="text-gray-300">{formatSize(stat.uploaded)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="bg-white/5 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                                <History className="w-8 h-8 text-gray-600" />
                                            </div>
                                            <p className="text-gray-400 font-medium">Historique indisponible</p>
                                            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
                                                Les données sont collectées quotidiennement. Revenez demain pour voir l'historique.
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end">
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
