'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Clock,
  HardDrive,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { SectionHeader } from './SharedComponents'

interface StuckItem {
  id: number
  type: 'radarr' | 'sonarr'
  title: string
  state: 'importBlocked' | 'importPending' | 'importing'
  firstSeenStuck: number
  lastSeen: number
  mediaTitle?: string
  seriesTitle?: string
  seasonNumber?: number
  movieId?: number
  seriesId?: number
  downloadId?: string
  size: number
  trackedDownloadState?: string
  trackedDownloadStatus?: string
  status?: string
  timeleft?: string
  stuckDuration: number
  isConfirmed: boolean
}

interface Stats {
  stuckCount: number
  confirmedStuckCount: number
  consecutiveErrors: number
  isSlow: boolean
  currentInterval: number
}

interface ApiResponse {
  items: StuckItem[]
  stats: Stats
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}j ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  return `${minutes}m`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export const StuckImportsManager = () => {
  const [items, setItems] = useState<StuckItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)
  const [showConfirmedOnly, setShowConfirmedOnly] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/stuck-imports')
      if (!response.ok) {
        throw new Error('Failed to fetch stuck imports')
      }
      const data: ApiResponse = await response.json()
      setItems(data.items)
      setStats(data.stats)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRefresh = async () => {
    try {
      setActionLoading(true)
      await fetch('/api/admin/stuck-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      })
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to refresh')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveSelected = async () => {
    if (selectedItems.size === 0) return

    if (!confirm(
      `Retirer ${selectedItems.size} items sélectionnés de la queue ?\n\n` +
      `Les fichiers déjà téléchargés ne seront PAS supprimés.`
    )) {
      return
    }

    const itemsToRemove = Array.from(selectedItems).map((key) => {
      const [type, id] = key.split(':')
      return { type: type as 'radarr' | 'sonarr', id: parseInt(id, 10) }
    })

    try {
      setActionLoading(true)
      const response = await fetch('/api/admin/stuck-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', items: itemsToRemove }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove items')
      }

      const result = await response.json()
      
      // Show success message
      alert(`${result.summary.success}/${result.summary.total} items retirés de la queue`)
      
      setSelectedItems(new Set())
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove items')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveAllConfirmed = async () => {
    if (!confirm(
      `Retirer ${confirmedCount} items de la queue Sonarr/Radarr ?\n\n` +
      `Les fichiers déjà téléchargés ne seront PAS supprimés.\n` +
      `Cette action est optionnelle (les items sont déjà ignorés par le système).`
    )) {
      return
    }

    try {
      setActionLoading(true)
      const response = await fetch('/api/admin/stuck-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeAllConfirmed' }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove items')
      }

      const result = await response.json()
      alert(`Supprimé ${result.summary.success}/${result.summary.total} items`)
      await fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove items')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleSelection = (key: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedItems(newSelected)
  }

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedItems(newExpanded)
  }

  const filteredItems = showConfirmedOnly
    ? items.filter((item) => item.isConfirmed)
    : items

  const confirmedCount = items.filter((i) => i.isConfirmed).length

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Imports bloqués"
        description="Items ignorés automatiquement (pas de notifs, pas de surcharge API). Le nettoyage manuel est optionnel."
        icon={AlertTriangle}
      />

      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Protection automatique active</p>
          <p className="text-blue-300/80">
            Les items bloqués depuis +30 min sont automatiquement ignorés : pas de notifications, polling réduit.
            Les items restent dans la queue Sonarr/Radarr. Le nettoyage manuel ci-dessous est optionnel.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Items bloqués</div>
            <div className="text-2xl font-bold text-amber-400">{stats.stuckCount}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Confirmés (&gt;30min)</div>
            <div className="text-2xl font-bold text-red-400">{stats.confirmedStuckCount}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Erreurs API</div>
            <div className={`text-2xl font-bold ${stats.consecutiveErrors > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.consecutiveErrors}
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
            <div className="text-sm text-gray-400">Intervalle polling</div>
            <div className={`text-2xl font-bold ${stats.isSlow ? 'text-amber-400' : 'text-green-400'}`}>
              {Math.round(stats.currentInterval / 1000)}s
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <button
          onClick={handleRefresh}
          disabled={actionLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white text-sm rounded-md transition-colors"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Rafraîchir
        </button>

        <div className="h-6 w-px bg-gray-600" />

        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showConfirmedOnly}
            onChange={(e) => setShowConfirmedOnly(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
          />
          <Filter className="w-4 h-4" />
          Confirmer uniquement ({confirmedCount})
        </label>

        <div className="flex-1" />

        {selectedItems.size > 0 && (
          <button
            onClick={handleRemoveSelected}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-sm rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Supprimer sélection ({selectedItems.size})
          </button>
        )}

        {confirmedCount > 0 && (
          <button
            onClick={handleRemoveAllConfirmed}
            disabled={actionLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:bg-gray-600 text-white text-sm rounded-md transition-colors"
            title="Optionnel : retire les items de la queue Sonarr/Radarr"
          >
            <AlertCircle className="w-4 h-4" />
            Nettoyer la queue ({confirmedCount})
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Items List */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Chargement...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p>Aucun import bloqué détecté</p>
          {stats && stats.isSlow && (
            <p className="text-sm text-amber-400 mt-2">
              Les APIs sont en mode ralenti (backoff actif)
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const key = `${item.type}:${item.id}`
            const isSelected = selectedItems.has(key)
            const isExpanded = expandedItems.has(key)

            return (
              <div
                key={key}
                className={`bg-gray-800/50 rounded-lg border transition-colors ${
                  item.isConfirmed
                    ? 'border-red-500/50 hover:border-red-500'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(key)}
                    className="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                  />

                  <div className="flex-shrink-0">
                    {item.type === 'radarr' ? (
                      <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">
                        R
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold">
                        S
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white truncate">
                        {item.mediaTitle || item.seriesTitle || item.title}
                      </span>
                      {item.seasonNumber && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                          S{item.seasonNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="truncate">{item.title}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(item.stuckDuration)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-gray-400">
                      <HardDrive className="w-4 h-4" />
                      <span>{formatBytes(item.size)}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        item.state === 'importBlocked'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {item.state}
                    </span>

                    <button
                      onClick={() => toggleExpand(key)}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-700/50 mt-1 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-400">
                        ID: <span className="text-gray-300">{item.id}</span>
                      </div>
                      <div className="text-gray-400">
                        Type: <span className="text-gray-300">{item.type}</span>
                      </div>
                      {item.movieId && (
                        <div className="text-gray-400">
                          Movie ID: <span className="text-gray-300">{item.movieId}</span>
                        </div>
                      )}
                      {item.seriesId && (
                        <div className="text-gray-400">
                          Series ID: <span className="text-gray-300">{item.seriesId}</span>
                        </div>
                      )}
                      {item.downloadId && (
                        <div className="text-gray-400 col-span-2">
                          Download ID: <span className="text-gray-300 font-mono text-xs">{item.downloadId}</span>
                        </div>
                      )}
                      {item.trackedDownloadStatus && (
                        <div className="text-gray-400">
                          Status: <span className="text-gray-300">{item.trackedDownloadStatus}</span>
                        </div>
                      )}
                      <div className="text-gray-400">
                        Détecté: <span className="text-gray-300">{new Date(item.firstSeenStuck).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
