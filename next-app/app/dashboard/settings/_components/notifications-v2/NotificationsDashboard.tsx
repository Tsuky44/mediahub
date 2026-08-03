'use client'

import { useState, useEffect } from 'react'
import {
  Bell,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
  RefreshCw,
} from 'lucide-react'

interface Delivery {
  id: number
  eventId: number
  recipient: string
  provider: string
  status: 'pending' | 'processing' | 'sent' | 'failed'
  attempts: number
  lastError: string | null
  sentAt: string | null
  nextRetryAt: string | null
  createdAt: string
}

interface NotificationEvent {
  id: number
  requestId: number | null
  tmdbId: string
  mediaType: 'movie' | 'tv'
  event: string
  correlationId: string
  payload: string // JSON
  status: string
  dedupKey: string
  createdAt: string
  dispatchedAt: string | null
  deliveries?: Delivery[]
}

interface Stats {
  totalEvents: number
  totalSent: number
  totalFailed: number
  totalPending: number
  successRate: number
}

export default function NotificationsDashboard() {
  const [events, setEvents] = useState<NotificationEvent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null)
  
  // Purge form
  const [purgeTmdbId, setPurgeTmdbId] = useState('')
  const [purgeLoading, setPurgeTmdbIdLoading] = useState(false)
  const [purgeMessage, setPurgeMessage] = useState('')

  // Retry loading per delivery
  const [retryLoadings, setRetryLoadings] = useState<Record<number, boolean>>({})

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await fetch('/api/admin/notifications')
      const data = await res.json()
      if (data.events) {
        setEvents(data.events)
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch notification debug data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(() => fetchData(true), 15_000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const handlePurge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purgeTmdbId.trim()) return

    setPurgeTmdbIdLoading(true)
    setPurgeMessage('')

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purge-dedup', tmdbId: purgeTmdbId.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setPurgeMessage(`✅ Clés de dédoublon purgées pour le TMDB ID ${purgeTmdbId}`)
        setPurgeTmdbId('')
        fetchData(true)
      } else {
        setPurgeMessage(`❌ Erreur: ${data.error}`)
      }
    } catch (err: any) {
      setPurgeMessage(`❌ Erreur: ${err.message}`)
    } finally {
      setPurgeTmdbIdLoading(false)
    }
  }

  const handleRetry = async (deliveryId: number) => {
    setRetryLoadings(prev => ({ ...prev, [deliveryId]: true }))
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', deliveryId }),
      })
      if (res.ok) {
        fetchData(true)
      }
    } catch (err) {
      console.error('Failed to retry delivery:', err)
    } finally {
      setRetryLoadings(prev => ({ ...prev, [deliveryId]: false }))
    }
  }

  const toggleExpand = (eventId: number) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId)
  }

  const filteredEvents = events.filter((e) => {
    if (!search.trim()) return true
    
    // Parse title or event name or recipient
    let title = ''
    try {
      const p = JSON.parse(e.payload)
      title = p.media?.title || ''
    } catch {}

    const searchLower = search.toLowerCase()
    const matchesTitle = title.toLowerCase().includes(searchLower)
    const matchesEvent = e.event.toLowerCase().includes(searchLower)
    const matchesTmdb = e.tmdbId.includes(searchLower)
    const matchesRecipient = e.deliveries?.some(d => d.recipient.includes(searchLower))

    return matchesTitle || matchesEvent || matchesTmdb || matchesRecipient
  })

  const getEventBadgeColor = (event: string) => {
    switch (event) {
      case 'MEDIA_REQUESTED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'MEDIA_APPROVED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
      case 'MEDIA_GRABBED': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'MEDIA_DOWNLOADING': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'MEDIA_DOWNLOAD_COMPLETE': return 'bg-teal-500/10 text-teal-400 border-teal-500/20'
      case 'MEDIA_IMPORTING': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      case 'MEDIA_AVAILABLE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'SEASON_PARTIALLY_AVAILABLE': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'MEDIA_FAILED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Envoyé
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle size={12} /> Échoué
          </span>
        )
      case 'pending':
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock size={12} /> En attente
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw size={36} className="text-indigo-500 animate-spin" />
        <p className="text-gray-400">Chargement de l'historique et des statistiques...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-1">
            <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Événements (7j)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.totalEvents}</span>
              <Bell size={16} className="text-blue-400" />
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-1">
            <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Envoyés (7j)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">{stats.totalSent}</span>
              <Send size={16} className="text-emerald-400" />
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-1">
            <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Échecs (7j)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400">{stats.totalFailed}</span>
              <AlertCircle size={16} className="text-rose-400" />
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-1">
            <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider">En cours (7j)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400">{stats.totalPending}</span>
              <Clock size={16} className="text-amber-400" />
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl col-span-2 md:col-span-1 space-y-1">
            <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Taux de succès</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{stats.successRate}%</span>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outils d'administration */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-indigo-400" />
            <h4 className="text-sm font-black text-white uppercase tracking-wider">Purger les clés anti-doublon d'un média</h4>
          </div>
          <p className="text-xs text-gray-400">
            Si une notification ne part pas ou si vous souhaitez re-notifier la disponibilité d'une série ou d'un film,
            purgez ses clés enregistrées en saisissant son TMDB ID.
          </p>
          <form onSubmit={handlePurge} className="flex gap-2 max-w-md">
            <input
              type="text"
              placeholder="ex: 1399 (TMDB ID)"
              value={purgeTmdbId}
              onChange={(e) => setPurgeTmdbId(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={purgeLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition"
            >
              {purgeLoading ? 'Purge...' : 'Purger'}
            </button>
          </form>
          {purgeMessage && <p className="text-xs font-semibold">{purgeMessage}</p>}
        </div>
      </div>

      {/* Historique des événements */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Historique des 200 derniers événements</h3>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="text-gray-400 hover:text-white transition disabled:opacity-50 p-1"
              title="Rafraîchir"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                autoRefresh
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
              title="Auto-rafraîchir toutes les 15 secondes"
            >
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher (titre, event, tmdb...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Aucun événement trouvé.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEvents.map((event) => {
                let payloadData: any = {}
                try {
                  payloadData = JSON.parse(event.payload)
                } catch {}

                const isTv = event.mediaType === 'tv'
                const title = payloadData.media?.title || 'Inconnu'
                const displayEventName = event.event.replace('MEDIA_', '').replace('SEASON_', '').replace('EPISODE_', '')

                return (
                  <div key={event.id} className="p-4 transition hover:bg-white/[0.02]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info Événement */}
                      <div className="flex items-start gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border ${getEventBadgeColor(event.event)}`}>
                          {displayEventName}
                        </span>
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-white leading-tight">
                            {title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>TMDB: {event.tmdbId}</span>
                            <span>•</span>
                            <span className="capitalize">{isTv ? 'Série' : 'Film'}</span>
                            <span>•</span>
                            <span>{new Date(event.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Deliveries status & actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-1 overflow-hidden">
                          {event.deliveries?.map((d) => (
                            <span 
                              key={d.id} 
                              className={`inline-block h-2 w-2 rounded-full ring-2 ring-gray-950 ${
                                d.status === 'sent' ? 'bg-emerald-500' : d.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              title={`${d.recipient} (${d.status})`}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => toggleExpand(event.id)}
                          className="text-gray-400 hover:text-white transition p-1"
                        >
                          {expandedEventId === event.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable delivery details & payloads */}
                    {expandedEventId === event.id && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-4 text-sm">
                        {/* Deliveries details list */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Livraisons</h5>
                          {event.deliveries && event.deliveries.length > 0 ? (
                            <div className="space-y-2 divide-y divide-white/[0.02]">
                              {event.deliveries.map((d) => (
                                <div key={d.id} className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                                  <div className="space-y-1">
                                    <p className="text-white font-medium">{d.recipient} <span className="text-gray-500">({d.provider})</span></p>
                                    {d.lastError && (
                                      <p className="text-rose-400 font-mono text-[10px] break-all max-w-xl bg-rose-950/20 p-1.5 rounded border border-rose-900/10">
                                        Error: {d.lastError}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-gray-500">
                                      Tentatives: {d.attempts} • Créé le: {new Date(d.createdAt).toLocaleTimeString()}
                                      {d.sentAt && ` • Envoyé à: ${new Date(d.sentAt).toLocaleTimeString()}`}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getDeliveryStatusBadge(d.status)}
                                    {d.status === 'failed' && (
                                      <button
                                        onClick={() => handleRetry(d.id)}
                                        disabled={retryLoadings[d.id]}
                                        className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 text-white px-2.5 py-1 rounded text-[10px] font-semibold transition disabled:opacity-50"
                                      >
                                        <RotateCcw size={10} /> {retryLoadings[d.id] ? 'Envoi...' : 'Réessayer'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">Aucun destinataire résolu pour cet événement.</p>
                          )}
                        </div>

                        {/* Event Payload */}
                        <div className="space-y-1.5">
                          <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Payload brut de l'événement</h5>
                          <pre className="bg-black/40 border border-white/5 p-3 rounded-lg text-[11px] font-mono text-gray-300 overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                            {JSON.stringify(payloadData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
