'use client'

import { useState, useEffect } from 'react'
import {
  RefreshCw, ExternalLink, Coins, Clock, BarChart3,
  Award, Globe, X, ArrowUp, ArrowDown
} from 'lucide-react'
import { getAllTrackerStats } from '@/app/dashboard/settings/tracker-stats-actions'
import { motion, AnimatePresence } from 'framer-motion'

interface TrackerStat {
  id: string
  name: string
  baseUrl?: string
  uploaded: string
  downloaded: string
  uploadedBytes: number
  downloadedBytes: number
  ratio: number
  ratioColor: string
  bonusPoints?: number
  seedingCount?: number
  leechingCount?: number
  lastUpdated: string
  enabled: boolean
}

/**
 * Get the custom label for bonus points based on tracker name
 */
function getBonusLabel(trackerName: string): string {
  const name = (trackerName || '').toLowerCase()
  if (name.includes('la cale') || name.includes('lacale') || name.includes('la-cale')) return 'Doublons'
  if (name.includes('torr9') || name.includes('tor9')) return 'Jetons'
  if (name.includes('abnormal') || name.includes('abn')) return 'Réputation'
  if (name.includes('gemini')) return 'Bonus'
  return 'Points'
}

function formatBonus(value: number): string {
  if (!value) return '0'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'k'
  return value.toLocaleString('fr-FR')
}

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `il y a ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `il y a ${h}h ${rm}min` : `il y a ${h}h`
}

function formatBytes(value: number): string {
  if (value === 0) return '0 o'
  const k = 1024
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To', 'Po']
  const i = Math.floor(Math.log(value) / Math.log(k))
  return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function TrackerDetailModal({
  stat,
  onClose
}: {
  stat: TrackerStat
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-indigo-500/20 rounded-xl">
              <Globe className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white truncate">{stat.name}</h3>
              {stat.baseUrl && (
                <a
                  href={stat.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ouvrir le tracker
                </a>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Ratio big */}
          <div className="bg-black/30 rounded-2xl p-4 text-center">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Ratio</p>
            <p className={`text-4xl font-black font-mono ${stat.ratioColor}`}>
              {stat.ratio.toFixed(2)}
            </p>
          </div>

          {/* Upload / Download */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Upload</span>
              </div>
              <p className="text-sm font-bold text-emerald-400 font-mono">{stat.uploaded}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{formatBytes(stat.uploadedBytes)}</p>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowDown className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Download</span>
              </div>
              <p className="text-sm font-bold text-blue-400 font-mono">{stat.downloaded}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{formatBytes(stat.downloadedBytes)}</p>
            </div>
          </div>

          {/* Bonus + Seeding/Leeching */}
          <div className="grid grid-cols-2 gap-3">
            {stat.bonusPoints !== undefined && stat.bonusPoints > 0 && (
              <div className="bg-black/30 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{getBonusLabel(stat.name)}</span>
                </div>
                <p className="text-sm font-bold text-amber-400 font-mono">{formatBonus(stat.bonusPoints)}</p>
              </div>
            )}
            {(stat.seedingCount !== undefined || stat.leechingCount !== undefined) && (
              <div className="bg-black/30 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Torrents</span>
                </div>
                <div className="flex gap-3 text-sm">
                  {stat.seedingCount !== undefined && (
                    <span className="font-bold text-emerald-400">↑ {stat.seedingCount}</span>
                  )}
                  {stat.leechingCount !== undefined && stat.leechingCount > 0 && (
                    <span className="font-bold text-blue-400">↓ {stat.leechingCount}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Last updated */}
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <Clock className="w-3 h-3" />
            Mis à jour: {stat.lastUpdated}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/5 border-t border-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-xl transition-all"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export function TrackerStatsCard() {
  const [stats, setStats] = useState<TrackerStat[]>([])
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; age?: number; expiresIn?: number }>({ cached: false })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTracker, setSelectedTracker] = useState<TrackerStat | null>(null)

  const loadStats = async (force: boolean = false) => {
    if (force) setRefreshing(true)
    try {
      const res = await getAllTrackerStats(force)
      setStats(res.formatted || [])
      setCacheInfo(res.cache || { cached: false })
    } catch (e) {
      console.error('Failed to load tracker stats:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center justify-center h-20">
          <RefreshCw className="w-5 h-5 text-indigo-400/50 animate-spin" />
        </div>
      </div>
    )
  }

  if (stats.length === 0) {
    return null
  }

  const enabledStats = stats.filter(s => s.enabled)
  const totalUpload = enabledStats.reduce((acc, s) => acc + (s.uploadedBytes || 0), 0)
  const totalDownload = enabledStats.reduce((acc, s) => acc + (s.downloadedBytes || 0), 0)
  const globalRatio = totalDownload > 0 ? totalUpload / totalDownload : (totalUpload > 0 ? 999 : 0)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        {/* Global Ratio Card */}
        <div className="md:col-span-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/5 transition-colors group">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ratio Global</span>
          </div>
          <div className="flex items-end justify-between">
            <p className={`text-lg font-black font-mono ${globalRatio >= 1 ? 'text-emerald-400' : globalRatio >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
              {globalRatio.toFixed(2)}
            </p>
            <button
              onClick={() => loadStats(true)}
              disabled={refreshing}
              title="Forcer le rafraîchissement"
              className="p-1.5 text-gray-500 hover:text-white transition-colors disabled:opacity-50 rounded-lg hover:bg-white/5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {cacheInfo.cached && cacheInfo.age !== undefined && (
            <p className="text-[9px] text-gray-600 flex items-center gap-1 mt-1">
              <Clock className="w-2.5 h-2.5" />
              {formatAge(cacheInfo.age)}
            </p>
          )}
        </div>

        {/* Individual Tracker Cards */}
        {enabledStats.map((stat) => (
          <button
            key={stat.id}
            onClick={() => setSelectedTracker(stat)}
            className="md:col-span-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:bg-white/10 hover:border-white/10 transition-all group text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Tracker</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{stat.name}</p>
              </div>
              <p className={`text-lg font-black font-mono ${stat.ratioColor} flex-shrink-0 ml-2`}>
                {stat.ratio.toFixed(2)}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedTracker && (
          <TrackerDetailModal
            stat={selectedTracker}
            onClose={() => setSelectedTracker(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
