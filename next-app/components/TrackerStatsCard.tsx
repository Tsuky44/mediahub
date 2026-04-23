'use client'

import { useState, useEffect } from 'react'
import { Database, RefreshCw, TrendingUp, TrendingDown, Award, ExternalLink, Coins, ChevronDown, Clock } from 'lucide-react'
import { getAllTrackerStats } from '@/app/dashboard/settings/tracker-stats-actions'

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

export function TrackerStatsCard() {
  const [stats, setStats] = useState<any[]>([])
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; age?: number; expiresIn?: number }>({ cached: false })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)

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
    // No interval: cache lasts 2h, scheduler refreshes in background
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-white/10 p-4">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (stats.length === 0) {
    return null // Don't show anything if no trackers configured
  }

  const enabledStats = stats.filter(s => s.enabled)
  const totalUpload = enabledStats.reduce((acc, s) => acc + (s.uploadedBytes || 0), 0)
  const totalDownload = enabledStats.reduce((acc, s) => acc + (s.downloadedBytes || 0), 0)
  const globalRatio = totalDownload > 0 ? totalUpload / totalDownload : (totalUpload > 0 ? 999 : 0)

  return (
    <div className="bg-gray-900/50 rounded-xl border border-white/10 overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Database className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Stats Trackers</h3>
            <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
              <span>{enabledStats.length} tracker{enabledStats.length > 1 ? 's' : ''}</span>
              <span>•</span>
              <span>Ratio global: <span className={globalRatio >= 1 ? 'text-emerald-400' : 'text-yellow-400'}>{globalRatio.toFixed(2)}</span></span>
              {cacheInfo.cached && cacheInfo.age !== undefined && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-3 h-3" />
                    {formatAge(cacheInfo.age)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              loadStats(true)
            }}
            disabled={refreshing}
            title="Forcer le rafraîchissement"
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-3">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-gray-500">Upload</span>
              </div>
              <div className="text-sm font-semibold text-emerald-400">
                {formatBytes(totalUpload)}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingDown className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-500">Download</span>
              </div>
              <div className="text-sm font-semibold text-blue-400">
                {formatBytes(totalDownload)}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-gray-500">Ratio</span>
              </div>
              <div className={`text-sm font-semibold ${globalRatio >= 1 ? 'text-emerald-400' : globalRatio >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {globalRatio.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Individual trackers - detailed cards (enabled only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enabledStats.map((stat) => (
              <div 
                key={stat.id} 
                className="p-3 rounded-lg border bg-gray-800/30 border-white/5 hover:border-white/10 transition-colors"
              >
                {/* Header: name + ratio + external link */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-400" />
                    <span className="font-medium text-white text-sm truncate">{stat.name}</span>
                    {stat.baseUrl && (
                      <a
                        href={stat.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-500 hover:text-indigo-400 transition-colors flex-shrink-0"
                        title={`Ouvrir ${stat.name}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className={`text-xl font-bold ${stat.ratioColor}`}>
                    {stat.ratio.toFixed(2)}
                  </div>
                </div>
                
                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-gray-500 mb-0.5">Upload</div>
                    <div className="text-emerald-400 font-semibold font-mono">{stat.uploaded}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-0.5">Download</div>
                    <div className="text-blue-400 font-semibold font-mono">{stat.downloaded}</div>
                  </div>
                  {stat.bonusPoints !== undefined && stat.bonusPoints > 0 && (
                    <div>
                      <div className="text-gray-500 mb-0.5 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {getBonusLabel(stat.name)}
                      </div>
                      <div className="text-amber-400 font-semibold font-mono">{formatBonus(stat.bonusPoints)}</div>
                    </div>
                  )}
                </div>
                
                {/* Seeding / Leeching info */}
                {(stat.seedingCount !== undefined || stat.leechingCount !== undefined) && (
                  <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-500 flex gap-3">
                    {stat.seedingCount !== undefined && <span>↑ {stat.seedingCount} seeding</span>}
                    {stat.leechingCount !== undefined && stat.leechingCount > 0 && <span>↓ {stat.leechingCount} leeching</span>}
                  </div>
                )}
                
                {/* Last updated */}
                <div className="mt-2 text-[10px] text-gray-600">
                  Mis à jour: {stat.lastUpdated}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <a 
              href="/dashboard/settings"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Configurer les trackers →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function formatBytes(value: number): string {
  if (value === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(value) / Math.log(k))
  return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
