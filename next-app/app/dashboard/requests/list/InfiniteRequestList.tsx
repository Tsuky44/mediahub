'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useInView } from 'react-intersection-observer'
import { fetchUserRequests, forceSyncRequests } from './actions'
import { Loader2, RefreshCw, CheckCircle2, Clock, Hourglass, User as UserIcon, Tv, Film, Info } from 'lucide-react'

interface InfiniteRequestListProps {
    initialData: {
        results: any[]
        total: number
        totalPages: number
    }
}

export function InfiniteRequestList({ initialData }: InfiniteRequestListProps) {
    const [items, setItems] = useState(initialData.results)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(initialData.totalPages > 1)
    const [loading, setLoading] = useState(false)
    const [isSyncing, startSync] = useTransition()
    const { ref, inView } = useInView()

    // Sync automatic if empty
    useEffect(() => {
        if (items.length === 0 && !isSyncing) {
            handleSync()
        }
    }, [])

    const handleSync = () => {
        startSync(async () => {
            const result = await forceSyncRequests()
            if (result.success) {
                if (result.syncedCount === 0) {
                    alert('Aucune demande trouvée sur Jellyseerr. Vérifiez votre configuration.')
                } else {
                    // Reload first page
                    const newData = await fetchUserRequests(1)
                    setItems(newData.results)
                    setPage(1)
                    setHasMore(newData.totalPages > 1)
                    if (newData.results.length === 0) {
                        alert(`Synchronisé ${result.syncedCount} demandes, mais aucune n'a pu être récupérée en base locale.`)
                    }
                }
            } else {
                alert(`Erreur lors de la synchronisation: ${result.error}`)
            }
        })
    }

    const loadMore = async () => {
        if (loading || !hasMore) return
        
        setLoading(true)
        const nextPage = page + 1
        const data = await fetchUserRequests(nextPage)
        
        if (data.results.length > 0) {
            setItems(prev => {
                const newItems = data.results.filter((newItem: any) => 
                    !prev.some((existingItem: any) => existingItem.id === newItem.id)
                )
                return [...prev, ...newItems]
            })
            setPage(nextPage)
            setHasMore(nextPage < (data.totalPages || 0))
        } else {
            setHasMore(false)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (inView && hasMore && !loading) {
            loadMore()
        }
    }, [inView, hasMore, loading])

    const mapStatus = (status: number) => {
        // Status Jellyseerr : 1=PENDING, 2=APPROVED, 3=PROCESSING, 4=PARTIAL, 5=AVAILABLE
        switch (status) {
            case 5: return 'available'
            case 4: return 'partial'
            case 3: return 'processing'
            case 2:
            case 1: return 'pending'
            default: return 'unknown'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm disabled:opacity-50 font-medium"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Synchronisation...' : 'Synchroniser les demandes'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {items.map((request: any) => {
                    const media = request.media || {}
                    const posterPath = media.posterPath 
                        ? `https://image.tmdb.org/t/p/w300${media.posterPath}` 
                        : '/placeholder.png'
                    
                    const status = request.status
                    const statusInfo: any = {
                        5: { label: 'Disponible', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: CheckCircle2 },
                        4: { label: 'Partiel', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: CheckCircle2 },
                        3: { label: 'En cours', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: Hourglass },
                        2: { label: 'Approuvée', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: CheckCircle2 },
                        1: { label: 'En attente', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: Clock },
                        default: { label: 'Inconnu', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: Info }
                    }
                    const currentStatus = statusInfo[status] || statusInfo.default
                    const StatusIcon = currentStatus.icon

                    const requesterName = request.requestedBy?.displayName || request.requestedBy?.email?.split('@')[0] || 'Inconnu'
                    
                    const mediaType = request.type === 'movie' ? 'movie' : 'tv'
                    const tmdbId = request.media?.tmdbId

                    return (
                        <div key={request.id} className="group relative bg-zinc-900/40 backdrop-blur-sm rounded-2xl border border-zinc-800/50 hover:border-indigo-500/30 transition-all duration-300 overflow-hidden shadow-xl">
                            <Link href={`/dashboard/media/${tmdbId}?type=${mediaType}`} className="flex flex-col md:flex-row">
                                {/* Poster Section */}
                                <div className="relative w-full md:w-40 aspect-[2/3] md:aspect-auto overflow-hidden bg-zinc-800">
                                    <img
                                        src={posterPath}
                                        alt={media.title || 'Unknown'}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:hidden" />
                                </div>

                                {/* Content Section */}
                                <div className="flex-1 p-6 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">
                                                    {request.type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                                                    {request.type === 'movie' ? 'Film' : 'Série'}
                                                </div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                    {media.title || 'Sans titre'}
                                                </h3>
                                            </div>
                                            
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color} self-start`}>
                                                <StatusIcon className="w-4 h-4" />
                                                <span className="text-sm font-semibold">{currentStatus.label}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-6">
                                            {/* Requester Info */}
                                            <div className="flex items-center gap-3 bg-zinc-800/30 px-3 py-1.5 rounded-xl border border-zinc-700/30">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                    <UserIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-zinc-500 uppercase font-bold leading-none">Demandé par</p>
                                                    <p className="text-sm font-medium text-zinc-200">{requesterName}</p>
                                                </div>
                                            </div>

                                            {/* Availability Indicator */}
                                            {request.isOnEmby ? (
                                                <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20 text-green-400 transition-all group/btn">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-sm font-semibold">Disponible sur Emby</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 bg-zinc-800/20 px-3 py-1.5 rounded-xl border border-zinc-700/20 text-zinc-500">
                                                    <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                                    <span className="text-sm font-medium">Non disponible sur Emby</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/50 text-[11px] text-zinc-500 font-medium">
                                        <span>ID: {request.id}</span>
                                        <span>Ajouté le {new Date(request.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )
                })}
            </div>

            {hasMore && (
                <div ref={ref} className="flex justify-center py-8">
                    {loading && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />}
                </div>
            )}

            {!hasMore && items.length > 0 && (
                <p className="text-center text-zinc-500 py-8 text-sm font-medium">
                    Toutes vos demandes ont été chargées
                </p>
            )}

            {items.length === 0 && !isSyncing && (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                    <Info className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm font-medium">Aucune demande trouvée</p>
                    <button 
                        onClick={handleSync}
                        className="text-indigo-400 mt-2 text-sm font-bold hover:text-indigo-300 transition-colors"
                    >
                        Recharger depuis Jellyseerr
                    </button>
                </div>
            )}
        </div>
    )
}
