'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Settings, Loader2, Calendar, User, Eye, CheckCircle2, AlertTriangle, FileText, ExternalLink, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ManageMediaModalProps {
  isOpen: boolean
  onClose: () => void
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
}

export function ManageMediaModal({ isOpen, onClose, tmdbId, mediaType, title }: ManageMediaModalProps) {
  const [loading, setLoading] = useState(true)
  const [mediaInfo, setMediaInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null) // Comma separated IDs
  const [selectedRequests, setSelectedRequests] = useState<number[]>([])
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      fetchMediaInfo()
    }
  }, [isOpen, tmdbId, mediaType])

  const fetchMediaInfo = async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?type=${mediaType}${refresh ? '&refresh=true' : ''}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch media info')
      }
      const data = await res.json()
      setMediaInfo(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRequest = async (requestIds: number | number[] | undefined) => {
    if (!requestIds) return;
    const idsArray = Array.isArray(requestIds) ? requestIds : [requestIds];
    if (idsArray.length === 0) return;

    const message = idsArray.length > 1 
      ? `Voulez-vous vraiment supprimer ces ${idsArray.length} demandes ?`
      : 'Voulez-vous vraiment supprimer cette demande ?';

    if (!confirm(message)) return
    
    const idsString = idsArray.join(',');
    setIsDeleting(idsString)
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?action=request&targetId=${idsString}&type=${mediaType}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        // Clear selection if bulk delete
        if (idsArray.length > 1) setSelectedRequests([]);
        
        // Rafraîchir les données immédiatement
        await fetchMediaInfo(true)
        
        // Attendre un tout petit peu pour laisser le temps à Sonarr de traiter la requête 
        // avant de rafraîchir la page parente
        setTimeout(() => {
          router.refresh()
        }, 500)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleRequestSelection = (requestId: number) => {
    setSelectedRequests(prev => 
      prev.includes(requestId) 
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    )
  }

  const handleDeleteMedia = async (mediaId: number | undefined, deleteFiles: boolean = false) => {
    if (!mediaId) return;
    
    const message = deleteFiles 
      ? `Voulez-vous vraiment supprimer ce média de ${mediaType === 'tv' ? 'Sonarr' : 'Radarr'} ? Cela supprimera également tous les fichiers.`
      : `Voulez-vous vraiment effacer les données locales de ce média ? (Les fichiers dans ${mediaType === 'tv' ? 'Sonarr' : 'Radarr'} ne seront pas supprimés)`;
    
    if (!confirm(message)) return
    
    setIsDeleting(mediaId.toString())
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?action=media&targetId=${mediaId}&type=${mediaType}&deleteFiles=${deleteFiles}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        if (deleteFiles) {
          // Forcer le rafraîchissement complet
          await fetch(`/api/media/availability/${tmdbId}?type=${mediaType}&refresh=true`)
          onClose()
        } else {
          // Rafraîchir les données immédiatement
          await fetchMediaInfo(true)
        }
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleMarkAsAvailable = async (mediaId: number | undefined) => {
    // mediaId can be the service ID or just a placeholder if we only have a local request
    const idToUse = mediaId || tmdbId;
    if (!confirm('Voulez-vous vraiment marquer ce média comme disponible localement ?')) return
    
    setIsDeleting(idToUse.toString())
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?action=status&type=${mediaType}`, {
        method: 'POST'
      })
      if (res.ok) {
        // Rafraîchir les données immédiatement
        await fetchMediaInfo(true)
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(null)
    }
  }

  if (!isOpen) return null

  const requests = Array.isArray(mediaInfo?.requests) ? mediaInfo.requests : []
  const availability = mediaInfo?.availability
  const hasMediaInService = availability?.status !== 'unknown'
  const externalServiceUrl = mediaInfo?.externalServiceUrl

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div>
            <h2 className="text-2xl font-bold text-indigo-400">Gérer {mediaType === 'tv' ? 'Série' : 'Film'}</h2>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="text-gray-400 animate-pulse">Chargement des données...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-4">
              <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 inline-block">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
              <button onClick={() => fetchMediaInfo(true)} className="block mx-auto text-indigo-400 hover:underline text-sm">Réessayer</button>
            </div>
          ) : !hasMediaInService && requests.length === 0 ? (
            <div className="py-10 text-center space-y-4">
              <div className="bg-indigo-500/10 text-indigo-400 p-4 rounded-xl border border-indigo-500/20 inline-block">
                <Settings className="h-8 w-8 mx-auto mb-2" />
                <p>Aucune donnée de gestion trouvée pour ce média.</p>
                <p className="text-xs text-gray-500 mt-2">Le média n'est pas présent dans {mediaType === 'tv' ? 'Sonarr' : 'Radarr'} et aucune demande locale n'a été trouvée.</p>
              </div>
              <button onClick={onClose} className="block mx-auto text-indigo-400 hover:underline text-sm">Fermer</button>
            </div>
          ) : (
            <>
              {/* Requests Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-400" />
                    Demandes Locales
                  </h3>
                  
                  {selectedRequests.length > 0 && (
                    <button 
                      onClick={() => handleDeleteRequest(selectedRequests)}
                      disabled={isDeleting !== null}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-all text-sm font-bold animate-in fade-in slide-in-from-right-2"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Supprimer ({selectedRequests.length})
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {requests.length > 0 ? (
                    requests.map((req: any) => {
                      if (!req) return null;
                      const isSelected = selectedRequests.includes(req.id);
                      const currentIsDeleting = isDeleting?.split(',').includes(req.id.toString());

                      return (
                        <div 
                          key={req.id} 
                          onClick={() => toggleRequestSelection(req.id)}
                          className={`group cursor-pointer bg-white/5 border rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all ${
                            isSelected ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            {/* Checkbox */}
                            <div className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 group-hover:border-white/40'
                            }`}>
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                  <User className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-white">{req.requestedBy?.displayName || req.requestedBy?.email || 'Inconnu'}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider">
                                    <Calendar className="h-3 w-3" />
                                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date inconnue'}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                  req.status === 5 ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                                }`}>
                                  {req.status === 5 ? 'Disponible' : 'En cours'}
                                </span>
                                {mediaType === 'tv' && req.seasons && req.seasons.length > 0 && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-indigo-500/20 text-indigo-400">
                                    Saisons: {req.seasons.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRequest(req.id);
                            }}
                            disabled={currentIsDeleting}
                            className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            {currentIsDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm italic py-4 text-center bg-white/5 rounded-xl border border-dashed border-white/10">Aucune demande locale active.</p>
                  )}
                </div>
              </section>

              {/* Media Management Section */}
              {hasMediaInService && (
                <section className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    Statut {mediaType === 'tv' ? 'Sonarr' : 'Radarr'}
                  </h3>
                  <div className="grid gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                availability.status === 'available' ? 'bg-green-500/20 text-green-500' : 
                                availability.status === 'partial' ? 'bg-blue-500/20 text-blue-500' :
                                'bg-yellow-500/20 text-yellow-500'
                            }`}>
                                {availability.status === 'available' ? <CheckCircle2 className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white tracking-tight">
                                    {availability.details?.title || 'Titre inconnu'}
                                </p>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                        availability.status === 'available' ? 'bg-green-500/20 text-green-500' : 
                                        availability.status === 'partial' ? 'bg-blue-500/20 text-blue-500' :
                                        'bg-yellow-500/20 text-yellow-500'
                                    }`}>
                                        {availability.status === 'available' ? 'Disponible' : 
                                         availability.status === 'partial' ? 'Partiellement disponible' :
                                         availability.status === 'pending' || availability.status === 'processing' ? 'En attente' : 'Inconnu'}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">ID: {availability.details?.id}</span>
                                </div>
                            </div>
                        </div>

                            <div className="flex gap-2">
                                {externalServiceUrl && (
                                    <a 
                                        href={externalServiceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                        title={`Ouvrir dans ${mediaType === 'tv' ? 'Sonarr' : 'Radarr'}`}
                                    >
                                        <ExternalLink className="h-5 w-5" />
                                    </a>
                                )}
                                {availability.status !== 'available' && (
                                    <button 
                                        onClick={() => handleMarkAsAvailable(availability.details?.id)}
                                        className="p-2.5 text-gray-400 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                                        title="Marquer comme disponible localement"
                                    >
                                        <CheckCircle2 className="h-5 w-5" />
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDeleteMedia(availability.details?.id, true)}
                                    disabled={isDeleting === availability.details?.id}
                                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                    title="Supprimer du service et les fichiers"
                                >
                                    {isDeleting === availability.details?.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                </button>
                            </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
