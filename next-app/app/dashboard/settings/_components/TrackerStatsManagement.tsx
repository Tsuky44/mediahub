'use client'

import { useState, useEffect } from 'react'
import { Database, Plus, Trash2, Edit2, Check, X, RefreshCw, TestTube, AlertCircle, ExternalLink, Download } from 'lucide-react'
import { 
  getConfiguredTrackers, 
  addTrackerConfig, 
  updateTrackerConfig, 
  deleteTrackerConfig, 
  testTrackerConnection,
  getAllTrackerStats,
  importTrackersFromProwlarr,
  debugProwlarrData 
} from '../tracker-stats-actions'

interface TrackerFormData {
  name: string
  type: 'gazelle' | 'unit3d' | 'jackett' | 'custom' | 'scraper'
  baseUrl: string
  apiKey: string
  username: string
  password: string
  passkey: string
  enabled: boolean
}

const TRACKER_TYPES = [
  { id: 'gazelle', name: 'Gazelle (RED, OPS, etc.)', description: 'Trackers basés sur Gazelle' },
  { id: 'unit3d', name: 'Unit3d (BLU, Aither, etc.)', description: 'Trackers basés sur Unit3d' },
  { id: 'jackett', name: 'Jackett/Prowlarr', description: 'Via Jackett ou Prowlarr' },
  { id: 'scraper', name: 'Scraper (C411, LaCale, etc.)', description: 'Trackers français nécessitant login' },
  { id: 'custom', name: 'API Personnalisée', description: 'Configuration manuelle' }
]

/**
 * Get the custom label for bonus points based on tracker name
 * Each French tracker has its own terminology (pirates, tokens, etc.)
 */
function getBonusLabel(trackerName: string): string {
  const name = (trackerName || '').toLowerCase()
  if (name.includes('la cale') || name.includes('lacale') || name.includes('la-cale')) return 'Doublons'
  if (name.includes('torr9') || name.includes('tor9')) return 'Jetons'
  if (name.includes('abnormal') || name.includes('abn')) return 'Réputation'
  if (name.includes('gemini')) return 'Bonus'
  return 'Points'
}

export function TrackerStatsManagement() {
  const [trackers, setTrackers] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [importing, setImporting] = useState(false)
  
  const [formData, setFormData] = useState<TrackerFormData>({
    name: '',
    type: 'gazelle',
    baseUrl: '',
    apiKey: '',
    username: '',
    password: '',
    passkey: '',
    enabled: true
  })

  const loadData = async (force: boolean = false) => {
    try {
      const [trackersRes, statsRes] = await Promise.all([
        getConfiguredTrackers(),
        getAllTrackerStats(force)
      ])
      setTrackers(trackersRes.configs)
      setStats(statsRes.formatted)
    } catch (e) {
      console.error('Failed to load tracker data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingId) {
      const res = await updateTrackerConfig(editingId, formData)
      if (res.success) {
        setShowForm(false)
        setEditingId(null)
        loadData()
      } else {
        alert(res.error)
      }
    } else {
      const res = await addTrackerConfig(formData)
      if (res.success) {
        setShowForm(false)
        loadData()
      } else {
        alert(res.error)
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce tracker ?')) return
    const res = await deleteTrackerConfig(id)
    if (res.success) {
      loadData()
    } else {
      alert(res.error)
    }
  }

  const handleTest = async (tracker: any) => {
    setTestingId(tracker.id)
    try {
      const res = await testTrackerConnection({
        ...tracker,
        apiKey: tracker.apiKey === '***hidden***' ? undefined : tracker.apiKey
      })
      if (res.success) {
        alert(`Connexion réussie !\nRatio: ${res.stats?.ratio.toFixed(2)}\nUpload: ${res.stats?.uploaded}`)
      } else {
        alert(`Erreur: ${res.error}`)
      }
    } finally {
      setTestingId(null)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData(true) // force bypass cache
    setRefreshing(false)
  }

  const startEdit = (tracker: any) => {
    setFormData({
      name: tracker.name,
      type: tracker.type,
      baseUrl: tracker.baseUrl,
      apiKey: '', // Don't show hidden value
      username: tracker.username || '',
      password: '', // Don't show hidden value
      passkey: '', // Don't show hidden value
      enabled: tracker.enabled
    })
    setEditingId(tracker.id)
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'gazelle',
      baseUrl: '',
      apiKey: '',
      username: '',
      password: '',
      passkey: '',
      enabled: true
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="bg-gray-900/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Statistiques des Trackers
          </h3>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {stats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun tracker configuré</p>
            <p className="text-sm mt-1">Ajoutez un tracker pour voir vos statistiques</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div 
                key={stat.id} 
                className={`bg-gray-800/50 rounded-lg p-4 border ${stat.enabled ? 'border-white/10' : 'border-gray-700 opacity-60'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">{stat.name}</h4>
                  <span className={`text-2xl font-bold ${stat.ratioColor}`}>
                    {stat.ratio.toFixed(2)}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Upload:</span>
                    <span className="text-emerald-400">{stat.uploaded}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Download:</span>
                    <span className="text-blue-400">{stat.downloaded}</span>
                  </div>
                  {stat.bonusPoints !== undefined && (
                    <div className="flex justify-between text-gray-400">
                      <span>{getBonusLabel(stat.name)}:</span>
                      <span className="text-amber-400">{stat.bonusPoints}</span>
                    </div>
                  )}
                  {stat.seedingCount !== undefined && (
                    <div className="flex justify-between text-gray-400">
                      <span>Seeding:</span>
                      <span className="text-purple-400">{stat.seedingCount}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
                  Mis à jour: {stat.lastUpdated}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tracker Configuration */}
      <div className="bg-gray-900/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-emerald-400" />
            Configuration des Trackers
          </h3>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setImporting(true)
                const res = await importTrackersFromProwlarr()
                setImporting(false)
                if (res.success) {
                  alert(`${res.imported} tracker(s) importé(s) depuis Prowlarr`)
                  loadData()
                } else {
                  alert(`Erreur: ${res.error}`)
                }
              }}
              disabled={importing}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className={`w-4 h-4 ${importing ? 'animate-bounce' : ''}`} />
              Importer depuis Prowlarr
            </button>
            <button
              onClick={async () => {
                const res = await debugProwlarrData()
                console.log('=== PROWLARR DEBUG ===', res)
                if (res.success) {
                  const hasStats = res.indexerStats && Object.keys(res.indexerStats).length > 0
                  alert(
                    `Debug Prowlarr :\n\n` +
                    `IndexerStats: ${hasStats ? 'OUI (voir console F12)' : 'Vide ou absent'}\n` +
                    `Indexers trouvés: ${res.allIndexerFields?.length || 0}\n\n` +
                    `Les détails sont dans la console (F12 → Console)`
                  )
                } else {
                  alert(`Erreur: ${res.error}`)
                }
              }}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              title="Afficher les données brutes de Prowlarr dans la console"
            >
              <AlertCircle className="w-4 h-4" />
              Debug
            </button>
            <button
              onClick={() => showForm ? resetForm() : setShowForm(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {showForm ? (
              <><X className="w-4 h-4" /> Annuler</>
            ) : (
              <><Plus className="w-4 h-4" /> Ajouter</>
            )}
          </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nom du tracker</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Redacted"
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TRACKER_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">URL de base</label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  placeholder="https://tracker.example.com"
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Clé API / Passkey</label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={editingId ? '•••••••• (laisser vide pour garder)' : ''}
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder={editingId ? '•••••••• (laisser vide pour garder)' : ''}
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingId ? '•••••••• (laisser vide pour garder)' : ''}
                  className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Activer</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-gray-900 text-indigo-600"
                  />
                  <span className="text-sm text-gray-300">{formData.enabled ? 'Activé' : 'Désactivé'}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        )}

        {/* Tracker List */}
        <div className="space-y-2">
          {trackers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun tracker configuré</p>
            </div>
          ) : (
            trackers.map((tracker) => (
              <div 
                key={tracker.id} 
                className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${tracker.enabled ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  <div>
                    <div className="font-medium text-white">{tracker.name}</div>
                    <div className="text-xs text-gray-500">{tracker.type} • {tracker.baseUrl}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTest(tracker)}
                    disabled={testingId === tracker.id}
                    className="p-2 text-gray-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                    title="Tester la connexion"
                  >
                    <TestTube className={`w-4 h-4 ${testingId === tracker.id ? 'animate-pulse' : ''}`} />
                  </button>
                  <button
                    onClick={() => startEdit(tracker)}
                    className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                    title="Modifier"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tracker.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
