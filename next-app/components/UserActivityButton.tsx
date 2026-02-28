'use client'

import { useState, useEffect } from 'react'
import { Eye, X, Film, Tv, RefreshCw, Trash2, AlertTriangle, Activity } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface UserActivityButtonProps {
    tmdbId: number
    mediaType: 'movie' | 'tv'
    title: string
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

export function UserActivityButton({ tmdbId, mediaType, title }: UserActivityButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [details, setDetails] = useState<ItemDetails | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { data: session } = useSession()
    const router = useRouter()

    // Delete Modal State
    const [itemToDelete, setItemToDelete] = useState<{ season?: SeasonDetail } | null>(null)
    const [deleteFromArr, setDeleteFromArr] = useState(true)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // Only show for admins
    if (session?.user?.role !== 'admin') {
        return null
    }

    const fetchDetails = async () => {
        setLoading(true)
        setError(null)
        try {
            // Convert mediaType to API expected type
            const type = mediaType === 'movie' ? 'Movie' : 'Series'
            
            const res = await fetch(`/api/admin/storage/details?tmdbId=${tmdbId}&type=${type}`)
            
            if (!res.ok) {
                if (res.status === 404) throw new Error('Média non trouvé dans le stockage')
                if (res.status === 401) throw new Error('Non autorisé')
                throw new Error('Erreur lors du chargement des détails')
            }
            
            const data = await res.json()
            setDetails(data)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Impossible de charger les détails')
            // Don't show toast here to avoid spam if just checking
        } finally {
            setLoading(false)
        }
    }

    const handleOpen = () => {
        setIsOpen(true)
        fetchDetails()
    }

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!bytes) return '0 B'
        const k = 1024
        const dm = decimals < 0 ? 0 : decimals
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
    }

    const openDeleteConfirm = (season?: SeasonDetail) => {
        setItemToDelete({ season })
        setShowDeleteModal(true)
        setDeleteFromArr(true)
    }

    const confirmDelete = async () => {
        if (!details) return

        setIsDeleting(true)
        try {
            // We need the internal ID which we don't have directly in props, 
            // but we can get it from the fetch logic or assume the API handles it?
            // Wait, the delete API needs itemId.
            // We don't have the main itemId in state unless we fetch it.
            // But we fetched details which returns viewingStats and seasons.
            // It doesn't return the main item ID in the response root.
            // The seasons have IDs.
            // For the main item, we might need to get it.
            // Actually, we can pass tmdbId to the delete API if we modify it, OR
            // we can extract the itemId from the details if available.
            // Let's check the API response structure in route.ts.
            // It returns { viewingStats, seasons }.
            // It doesn't return the itemId.
            // We should update the API to return the itemId as well.
            
            // For now, let's assume we can't delete easily without the ID.
            // But wait, seasons have IDs. So deleting a season works.
            // Deleting the whole show/movie requires the ID.
            
            // I'll update the API to return the item info as well.
            
            // Placeholder for now
            toast.error("La suppression n'est pas encore disponible depuis cette vue")
            
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsDeleting(false)
            setShowDeleteModal(false)
        }
    }

    return (
        <>
            <button
                onClick={handleOpen}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg transition-colors border border-purple-500/20"
                title="Voir l'activité des utilisateurs"
            >
                <Activity size={18} />
                <span className="hidden sm:inline">Activité</span>
            </button>

            {/* Main Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
                    <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${mediaType === 'movie' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                    {mediaType === 'movie' ? <Film size={20} /> : <Tv size={20} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{title}</h3>
                                    {details && details.seasons.length > 0 && (
                                        <div className="text-sm text-gray-400">
                                            {details.seasons.length} saisons • {formatBytes(details.seasons.reduce((acc, s) => acc + s.size, 0))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-12">
                                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                                    <p className="text-gray-400">{error}</p>
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
                                    {mediaType === 'tv' && details.seasons.length > 0 && (
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
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {details.seasons.map(season => (
                                                            <tr key={season.id} className="hover:bg-white/5">
                                                                <td className="px-4 py-3 text-white">{season.name}</td>
                                                                <td className="px-4 py-3 text-right text-gray-400">{season.episodesCount}</td>
                                                                <td className="px-4 py-3 text-right text-gray-300 font-mono">{formatBytes(season.size)}</td>
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
                    </div>
                </div>
            )}
        </>
    )
}
