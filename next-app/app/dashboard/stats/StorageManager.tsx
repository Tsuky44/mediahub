'use client'

import { useState, useEffect } from 'react'
import { Trash2, Film, Tv, Play, RefreshCw, HardDrive, Search, X, User, Check, Eye, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface StorageItem {
  id: string
  name: string
  type: 'Movie' | 'Series'
  size: number
  path?: string
  isPlaying: boolean
  activeUser?: string
  episodesCount?: number
  addedAt: string
  tmdbId?: number
  tvdbId?: number
}

interface SeasonStat {
  seasonNumber: number
  total: number
  played: number
  percentage: number
}

interface ViewingStat {
  userId: string
  userName: string
  played: boolean
  lastPlayedDate: string | null
  playbackPositionTicks: number
  totalDurationTicks: number
  percentage: number
  episodeText?: string
  seasons?: SeasonStat[]
  playedEpisodes?: number
  totalEpisodes?: number
}

interface SeasonDetail {
  id: string
  name: string
  index: number
  size: number
  episodesCount: number
  path: string
}

interface ItemDetails {
  viewingStats: ViewingStat[]
  seasons: SeasonDetail[]
}

export function StorageManager({ canDelete = false }: { canDelete?: boolean }) {
  const [items, setItems] = useState<StorageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'Movie' | 'Series'>('Movie')
  const router = useRouter()

  // Details Modal State
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null)
  const [details, setDetails] = useState<ItemDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Delete Modal State
  const [itemToDelete, setItemToDelete] = useState<{ item: StorageItem, season?: SeasonDetail } | null>(null)
  const [deleteFromArr, setDeleteFromArr] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchStorage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/storage')
      if (!res.ok) throw new Error('Erreur lors du chargement des données')
      const data = await res.json()
      setItems(data)
    } catch (error) {
      toast.error('Impossible de charger les statistiques de stockage')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStorage()
  }, [])

  const fetchDetails = async (item: StorageItem) => {
    setSelectedItem(item)
    setLoadingDetails(true)
    setDetails(null)
    try {
      const res = await fetch(`/api/admin/storage/details?itemId=${item.id}&type=${item.type}`)
      if (!res.ok) throw new Error('Erreur lors du chargement des détails')
      const data = await res.json()
      setDetails(data)
    } catch (error) {
      console.error(error)
      toast.error('Impossible de charger les détails')
    } finally {
      setLoadingDetails(false)
    }
  }

  const openDeleteModal = (item: StorageItem, season?: SeasonDetail, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (item.isPlaying) {
      toast.error(`Impossible de supprimer : ${item.activeUser} regarde ce contenu actuellement !`)
      return
    }
    setItemToDelete({ item, season })
    setDeleteFromArr(true) // Default to true
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      const { item, season } = itemToDelete
      
      const payload = {
        itemId: season ? season.id : item.id,
        type: season ? 'Season' : item.type,
        deleteFromArr,
        providerId: item.type === 'Movie' ? item.tmdbId : item.tvdbId,
        seasonNumber: season ? season.index : undefined
      }

      const res = await fetch('/api/admin/storage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }

      toast.success(season ? 'Saison supprimée' : 'Élément supprimé avec succès')
      
      if (season) {
        // Refresh details only
        fetchDetails(item)
        // Update main list size optimistically or refresh
        fetchStorage()
      } else {
        setItems(items.filter(i => i.id !== item.id))
        setSelectedItem(null)
        router.refresh()
      }
      
      setItemToDelete(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  const filteredItems = items.filter(item => 
    item.type === activeTab &&
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSize = items.reduce((acc, item) => acc + item.size, 0)
  const categorySize = items
    .filter(i => i.type === activeTab)
    .reduce((acc, item) => acc + item.size, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive className="text-purple-400" />
            Gestion du Stockage
          </h2>
          <p className="text-sm text-gray-400">
            Total : <span className="text-white font-medium">{formatBytes(totalSize)}</span>
            {' • '}
            <span className={activeTab === 'Movie' ? 'text-blue-400' : 'text-green-400'}>
              {activeTab === 'Movie' ? 'Films' : 'Séries'} : {formatBytes(categorySize)}
            </span>
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Tabs */}
          <div className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 border border-white/5">
            <button
              onClick={() => setActiveTab('Movie')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'Movie' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <Film size={16} />
                Films
              </span>
            </button>
            <button
              onClick={() => setActiveTab('Series')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'Series' 
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <Tv size={16} />
                Séries
              </span>
            </button>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 backdrop-blur-sm border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
            />
          </div>
          <button 
            onClick={fetchStorage} 
            className="p-2.5 bg-black/40 backdrop-blur-sm border border-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all shadow-sm hover:shadow-md"
            title="Actualiser"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-xl">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-gray-400 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-5">Média</th>
                <th className="px-6 py-5 text-right">Taille</th>
                <th className="px-6 py-5 text-center">État</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Chargement des données...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Aucun média trouvé
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => fetchDetails(item)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${item.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                          {item.type === 'Movie' ? <Film size={18} /> : <Tv size={18} />}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-purple-400 transition-colors">{item.name}</div>
                          {item.type === 'Series' && (
                            <div className="text-xs text-gray-500">{item.episodesCount} épisodes</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300 font-mono">
                      {formatBytes(item.size)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.isPlaying ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <Play size={10} className="fill-current" />
                          Lecture par {item.activeUser}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => openDeleteModal(item, undefined, e)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-white/5">
            {loading ? (
                <div className="px-6 py-8 text-center text-gray-400">
                    Chargement des données...
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-400">
                    Aucun média trouvé
                </div>
            ) : (
                filteredItems.map((item) => (
                    <div 
                        key={item.id} 
                        onClick={() => fetchDetails(item)}
                        className="p-4 hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10"
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-2 rounded-lg shrink-0 ${item.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {item.type === 'Movie' ? <Film size={18} /> : <Tv size={18} />}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium text-white truncate pr-2">{item.name}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{formatBytes(item.size)}</span>
                                        {item.type === 'Series' && (
                                            <>
                                                <span>•</span>
                                                <span>{item.episodesCount} épisodes</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={(e) => openDeleteModal(item, undefined, e)}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {item.isPlaying && (
                            <div className="mt-2 flex justify-start">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                    <Play size={10} className="fill-current" />
                                    Lecture par {item.activeUser}
                                </span>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedItem(null)}>
          <div className="bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedItem.type === 'Movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {selectedItem.type === 'Movie' ? <Film size={20} /> : <Tv size={20} />}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>{formatBytes(selectedItem.size)}</span>
                        <span>•</span>
                        <span>Ajouté le {new Date(selectedItem.addedAt).toLocaleDateString()}</span>
                    </div>
                </div>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                {loadingDetails ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                    </div>
                ) : details ? (
                    <>
                        {/* Users Progress Section */}
                        <div className="space-y-4">
                            <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
                                <Eye size={16} />
                                Activité des utilisateurs
                            </h4>
                            {details.viewingStats.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {details.viewingStats.map(stat => (
                                        <div key={stat.userId} className="bg-white/5 rounded-lg p-3 flex items-center gap-3 border border-white/5">
                                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                                                {stat.userName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium text-white truncate">{stat.userName}</span>
                                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                                        {stat.totalEpisodes !== undefined && (
                                                            <span>{stat.playedEpisodes}/{stat.totalEpisodes} eps</span>
                                                        )}
                                                        <span className="font-medium text-white">{Math.round(stat.percentage)}%</span>
                                                    </div>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${stat.played ? 'bg-green-500' : 'bg-purple-500'}`} 
                                                        style={{ width: `${stat.percentage}%` }}
                                                    />
                                                </div>
                                                <div className="mt-1 text-xs text-gray-500 flex justify-between items-center">
                                                    <span className="truncate mr-2 flex-1" title={stat.episodeText || (stat.played ? 'Vu' : 'En cours')}>
                                                        {stat.episodeText || (stat.played ? 'Vu' : 'En cours')}
                                                    </span>
                                                    <span className="whitespace-nowrap ml-2" title="Date de dernière lecture">
                                                        {stat.lastPlayedDate ? new Date(stat.lastPlayedDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Jamais'}
                                                    </span>
                                                </div>
                                                
                                                {/* Per Season Breakdown */}
                                                {stat.seasons && stat.seasons.length > 0 && (
                                                    <div className="mt-3 pt-2 border-t border-white/5">
                                                        <div className="flex flex-wrap gap-2">
                                                            {stat.seasons.map(s => (
                                                                <div key={s.seasonNumber} className="text-[10px] text-gray-400 text-center bg-black/20 rounded p-1.5 min-w-[3rem] flex-1 max-w-[4rem]" title={`${s.played}/${s.total} épisodes vus`}>
                                                                    <div className="mb-0.5 font-medium text-gray-300">S{s.seasonNumber}</div>
                                                                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-1">
                                                                        <div className={`h-full ${s.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${s.percentage}%` }}></div>
                                                                    </div>
                                                                    <div>{Math.round(s.percentage)}%</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-gray-500 italic text-sm p-4 bg-white/5 rounded-lg text-center">
                                    Aucune activité récente détectée.
                                </div>
                            )}
                        </div>

                        {/* Seasons Section (Series Only) */}
                        {selectedItem.type === 'Series' && details.seasons.length > 0 && (
                            <div className="space-y-4">
                                <h4 className="text-sm uppercase tracking-wider text-gray-500 font-semibold flex items-center gap-2">
                                    <Tv size={16} />
                                    Saisons ({details.seasons.length})
                                </h4>
                                <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                                    {/* Desktop Table */}
                                    <table className="hidden md:table w-full text-left text-sm">
                                        <thead className="bg-black/20 text-gray-400">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Nom</th>
                                                <th className="px-4 py-3 font-medium text-right">Épisodes</th>
                                                <th className="px-4 py-3 font-medium text-right">Taille</th>
                                                <th className="px-4 py-3 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {details.seasons.map(season => (
                                                <tr key={season.id} className="hover:bg-white/5">
                                                    <td className="px-4 py-3 text-white">{season.name}</td>
                                                    <td className="px-4 py-3 text-right text-gray-400">{season.episodesCount}</td>
                                                    <td className="px-4 py-3 text-right text-gray-300 font-mono">{formatBytes(season.size)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {canDelete && (
                                                            <button 
                                                                onClick={() => openDeleteModal(selectedItem, season)}
                                                                className="text-gray-500 hover:text-red-400 p-1 rounded transition-colors"
                                                                title="Supprimer la saison"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {/* Mobile List */}
                                    <div className="md:hidden divide-y divide-white/5">
                                        {details.seasons.map(season => (
                                            <div key={season.id} className="p-3 flex items-center justify-between">
                                                <div className="min-w-0">
                                                    <div className="text-white font-medium">{season.name}</div>
                                                    <div className="text-xs text-gray-400 flex gap-2">
                                                        <span>{season.episodesCount} épisodes</span>
                                                        <span>•</span>
                                                        <span className="font-mono">{formatBytes(season.size)}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => openDeleteModal(selectedItem, season)}
                                                    className="text-gray-500 hover:text-red-400 p-2 rounded transition-colors"
                                                    title="Supprimer la saison"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center text-gray-500 py-12">Détails indisponibles</div>
                )}
            </div>

            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end">
                 <button 
                    onClick={() => openDeleteModal(selectedItem)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-red-500/20"
                 >
                    <Trash2 size={18} />
                    Supprimer {selectedItem.type === 'Series' ? 'la série complète' : 'le film'}
                 </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A]/95 border border-red-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden ring-1 ring-red-500/20 animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-500"></div>
                
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                        <AlertTriangle className="text-red-500 w-5 h-5" />
                    </div>
                    Confirmation
                </h3>
                
                <p className="text-gray-300 mb-6 mt-4 leading-relaxed">
                    Êtes-vous sûr de vouloir supprimer 
                    <span className="font-bold text-white block mt-1 p-2 bg-white/5 rounded-lg border border-white/5">
                        {itemToDelete.season ? `${itemToDelete.season.name} de ` : ''}{itemToDelete.item.name}
                    </span>
                    <span className="text-xs text-red-400 mt-3 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                        <AlertTriangle size={12} />
                        Cette action est irréversible et supprimera les fichiers.
                    </span>
                </p>

                <div className="bg-black/30 p-4 rounded-xl mb-6 flex items-start gap-3 border border-white/5 hover:border-white/10 transition-colors cursor-pointer" onClick={() => setDeleteFromArr(!deleteFromArr)}>
                    <div className="mt-0.5 relative flex items-center">
                        <input 
                            type="checkbox" 
                            id="deleteArr" 
                            checked={deleteFromArr} 
                            onChange={(e) => setDeleteFromArr(e.target.checked)}
                            className="w-5 h-5 rounded-md border-gray-600 text-red-500 focus:ring-red-500/50 bg-gray-800 transition-all cursor-pointer"
                        />
                    </div>
                    <label htmlFor="deleteArr" className="text-sm text-gray-300 cursor-pointer select-none flex-1">
                        <span className="font-bold text-white block mb-0.5">Arrêter le suivi (Recommandé)</span>
                        Supprime également la surveillance dans {itemToDelete.item.type === 'Movie' ? 'Radarr' : 'Sonarr'} pour éviter le re-téléchargement.
                    </label>
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setItemToDelete(null)}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        disabled={isDeleting}
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={confirmDelete}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}


