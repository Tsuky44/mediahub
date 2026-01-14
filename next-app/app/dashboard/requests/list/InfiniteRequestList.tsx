'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useInView } from 'react-intersection-observer'
import { fetchUserRequests, forceSyncRequests } from './actions'
import { Loader2, RefreshCw, CheckCircle2, Clock, Hourglass, User as UserIcon, Tv, Film, Info, Trash2, ImageOff, CheckSquare, Square, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

const MediaPoster = ({ 
    src, 
    alt, 
    fallbackSrc, 
    placeholder 
}: { 
    src: string | null, 
    alt: string, 
    fallbackSrc?: string | null,
    placeholder: React.ReactNode 
}) => {
    const [error, setError] = useState(false)
    const [usingFallback, setUsingFallback] = useState(false)
    const [imgSrc, setImgSrc] = useState<string | null>(src)

    useEffect(() => {
        setImgSrc(src)
        setError(false)
        setUsingFallback(false)
    }, [src])

    const handleError = () => {
        if (!usingFallback && fallbackSrc && fallbackSrc !== src) {
            setUsingFallback(true)
            setImgSrc(fallbackSrc)
        } else {
            setError(true)
        }
    }

    if (!imgSrc || error) {
        return <>{placeholder}</>
    }

    return (
        <img
            src={imgSrc}
            alt={alt}
            onError={handleError}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
        />
    )
}

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
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const { ref, inView } = useInView()

    const toggleSelection = (requestId: number) => {
        setSelectedIds(prev => 
            prev.includes(requestId) 
                ? prev.filter(id => id !== requestId) 
                : [...prev, requestId]
        )
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === items.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(items.map(item => item.id))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return

        const count = selectedIds.length
        if (!window.confirm(`Voulez-vous vraiment supprimer les ${count} demandes sélectionnées ?`)) return

        setIsBulkDeleting(true)
        try {
            // Group selected items by TMDB ID to make efficient API calls if possible,
            // but the current API structure requires a tmdbId in the URL path.
            // Let's see if we can simplify this. 
            // The API expects: /api/media/[tmdbId]/manage?action=request&targetId=id1,id2&type=type
            
            // We'll group by (tmdbId, mediaType)
            const groups: Record<string, { tmdbId: string, type: string, ids: number[] }> = {}
            
            selectedIds.forEach(id => {
                const item = items.find(i => i.id === id)
                if (item) {
                    const key = `${item.media.tmdbId}-${item.type}`
                    if (!groups[key]) {
                        groups[key] = { tmdbId: item.media.tmdbId, type: item.type, ids: [] }
                    }
                    groups[key].ids.push(id)
                }
            })

            let successCount = 0
            let errorOccurred = false

            for (const key in groups) {
                const group = groups[key]
                const res = await fetch(`/api/media/${group.tmdbId}/manage?action=request&targetId=${group.ids.join(',')}&type=${group.type}`, {
                    method: 'DELETE'
                })

                if (res.ok) {
                    successCount += group.ids.length
                } else {
                    errorOccurred = true
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} demande(s) supprimée(s) avec succès`)
                setItems(prev => prev.filter(item => !selectedIds.includes(item.id)))
                setSelectedIds([])
            }

            if (errorOccurred) {
                toast.error('Certaines demandes n\'ont pas pu être supprimées')
            }
        } catch (error) {
            console.error('[InfiniteRequestList] Bulk delete error:', error)
            toast.error('Une erreur est survenue lors de la suppression groupée')
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const handleDelete = async (e: React.MouseEvent, requestId: number, title: string, tmdbId: string, mediaType: string) => {
        e.preventDefault()
        e.stopPropagation()

        console.log('[InfiniteRequestList] handleDelete called for:', requestId, title, tmdbId, mediaType)

        if (!window.confirm(`Voulez-vous vraiment supprimer la demande pour "${title}" ?`)) return

        setDeletingId(requestId)
        try {
            const res = await fetch(`/api/media/${tmdbId}/manage?action=request&targetId=${requestId}&type=${mediaType}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                toast.success('Demande supprimée avec succès')
                setItems(prev => prev.filter(item => item.id !== requestId))
            } else {
                const data = await res.json()
                toast.error(data.error || 'Erreur lors de la suppression')
            }
        } catch (error) {
            console.error('[InfiniteRequestList] Delete error:', error)
            toast.error('Une erreur est survenue')
        } finally {
            setDeletingId(null)
        }
    }

    // Sync automatic if empty
    // useEffect(() => {
    //    if (items.length === 0 && !isSyncing) {
    //        handleSync()
    //    }
    // }, [])

    const handleRefresh = () => {
        startSync(async () => {
            // Just reload first page
            const newData = await fetchUserRequests(1)
            setItems(newData.results)
            setPage(1)
            setHasMore(newData.totalPages > 1)
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
        // Status: 1=PENDING, 2=APPROVED/PROCESSING, 3=PROCESSING, 4=PARTIAL, 5=AVAILABLE
        switch (status) {
            case 5: return 'available'
            case 4: return 'partial'
            case 3: return 'processing'
            case 2: return 'processing'
            case 1: return 'pending'
            default: return 'unknown'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all text-sm font-bold shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                {isBulkDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                Supprimer ({selectedIds.length})
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white transition-all"
                                title="Annuler la sélection"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm font-medium"
                    >
                        {selectedIds.length === items.length && items.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        Tout sélectionner
                    </button>

                    <button 
                        onClick={handleRefresh}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all text-sm disabled:opacity-50 font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        Actualiser
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {items.map((request: any) => {
                    const isSelected = selectedIds.includes(request.id)
                    const media = request.media || {}
                    const mediaType = request.type === 'movie' ? 'movie' : 'tv'
                    const tmdbId = request.media?.tmdbId

                    let posterPath = null
                    let fallbackPosterPath = null
                    const proxyUrl = tmdbId ? `/api/media/image/${tmdbId}?tmdbId=${tmdbId}&mediaType=${mediaType}` : null
                    
                    if (media.posterPath) {
                        if (media.posterPath.startsWith('http')) {
                            posterPath = media.posterPath
                            fallbackPosterPath = proxyUrl
                        } else if (media.posterPath.startsWith('/api/v3/mediacover') || 
                                 media.posterPath.startsWith('/api/mediacover') ||
                                 media.posterPath === "null" ||
                                 media.posterPath === "undefined" ||
                                 media.posterPath === "") {
                            // Chemin invalide, on utilisera le proxy directement
                            posterPath = proxyUrl
                        } else {
                            const cleanPath = media.posterPath.startsWith('/') ? media.posterPath : `/${media.posterPath}`
                            posterPath = `https://image.tmdb.org/t/p/w300${cleanPath}`
                            fallbackPosterPath = proxyUrl
                        }
                    } else if (tmdbId) {
                        // Fallback vers le proxy si pas de poster du tout
                        posterPath = proxyUrl
                    }
                    
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
                    
                    return (
                        <div 
                            key={request.id} 
                            onClick={() => toggleSelection(request.id)}
                            className={`group relative bg-zinc-900/40 backdrop-blur-sm rounded-2xl border transition-all duration-300 overflow-hidden shadow-xl cursor-pointer ${
                                isSelected 
                                    ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/5' 
                                    : 'border-zinc-800/50 hover:border-indigo-500/30'
                            }`}
                        >
                            {/* Selection Checkbox */}
                            <div className={`absolute top-4 left-4 z-20 transition-all duration-300 ${
                                isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                            }`}>
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                                    isSelected 
                                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/40' 
                                        : 'bg-zinc-900/80 border-zinc-700 text-zinc-500'
                                }`}>
                                    {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row">
                                {/* Poster Section */}
                                <Link 
                                    href={`/dashboard/media/${tmdbId}?type=${mediaType}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="relative w-full md:w-40 aspect-[2/3] md:aspect-auto overflow-hidden bg-zinc-800 flex items-center justify-center"
                                >
                            <MediaPoster 
                                src={posterPath}
                                fallbackSrc={fallbackPosterPath}
                                alt={media.title || 'Unknown'}
                                placeholder={
                                    <div className="flex flex-col items-center justify-center p-4 text-center">
                                        <Film className="w-8 h-8 text-zinc-700 mb-2" />
                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider line-clamp-2">
                                            {media.title || 'Sans titre'}
                                        </span>
                                    </div>
                                }
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent md:hidden" />
                        </Link>

                                {/* Content Section */}
                                <div className="flex-1 p-6 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                            <Link 
                                                href={`/dashboard/media/${tmdbId}?type=${mediaType}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className="space-y-1 block flex-1"
                                            >
                                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400/80">
                                                    {request.type === 'movie' ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
                                                    {request.type === 'movie' ? 'Film' : 'Série'}
                                                </div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                    {media.title || 'Sans titre'}
                                                </h3>
                                            </Link>
                                            
                                            <div className="flex items-center gap-3 self-start">
                                                <button
                              onClick={(e) => handleDelete(e, request.id, media.title || 'Sans titre', media.tmdbId, mediaType)}
                              disabled={deletingId === request.id}
                              className="p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all disabled:opacity-50 relative z-10"
                              title="Supprimer la demande"
                          >
                                                    {deletingId === request.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                                            {/* Status Badge */}
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color}`}>
                                                <StatusIcon className="w-4 h-4" />
                                                <span className="text-sm font-bold uppercase tracking-wide">{currentStatus.label}</span>
                                            </div>

                                            {/* Seasons Info for TV */}
                                            {request.type === 'tv' && request.media?.seasons && request.media.seasons.length > 0 && (
                                                <div className="flex items-center gap-3 bg-indigo-500/5 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                        <Tv className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-indigo-400/60 uppercase font-bold leading-none">Saisons demandées</p>
                                                        <p className="text-sm font-bold text-indigo-300">
                                                            {request.media.seasons.join(', ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

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

                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/50 text-[11px] text-zinc-500 font-medium">
                                        <div className="flex items-center gap-2">
                                            <span>ID: {request.id}</span>
                                            {tmdbId && <span>| TMDB: {tmdbId}</span>}
                                            {mediaType && <span>| Type: {mediaType}</span>}
                                        </div>
                                        <span>Ajouté le {new Date(request.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
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
                        onClick={handleRefresh}
                        className="text-indigo-400 mt-2 text-sm font-bold hover:text-indigo-300 transition-colors"
                    >
                        Actualiser
                    </button>
                </div>
            )}
        </div>
    )
}
