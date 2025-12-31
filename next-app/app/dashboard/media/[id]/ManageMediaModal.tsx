'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, Settings, Loader2, Calendar, User, Eye, CheckCircle2, AlertTriangle, FileText, ExternalLink } from 'lucide-react'
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
  const [isDeleting, setIsDeleting] = useState<number | null>(null) // ID of request/media being deleted
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      fetchMediaInfo()
    }
  }, [isOpen, tmdbId, mediaType])

  const fetchMediaInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?type=${mediaType}`)
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

  const handleDeleteRequest = async (requestId: number | undefined) => {
    if (!requestId) return;
    if (!confirm('Voulez-vous vraiment supprimer cette demande ?')) return
    
    setIsDeleting(requestId)
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?action=request&targetId=${requestId}&type=${mediaType}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchMediaInfo()
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDeleteMedia = async (mediaId: number | undefined, deleteFiles: boolean = false) => {
    if (!mediaId) return;
    
    const message = deleteFiles 
      ? `Voulez-vous vraiment supprimer ce média de ${mediaType === 'tv' ? 'Sonarr' : 'Radarr'} ? Cela supprimera également tous les fichiers.`
      : 'Voulez-vous vraiment effacer les données de ce média dans Jellyseerr ? (Les fichiers ne seront pas supprimés)';
    
    if (!confirm(message)) return
    
    setIsDeleting(mediaId)
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?action=media&targetId=${mediaId}&type=${mediaType}&deleteFiles=${deleteFiles}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        if (deleteFiles) {
          onClose()
        } else {
          fetchMediaInfo()
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
    if (!mediaId) return;
    if (!confirm('Voulez-vous vraiment marquer ce média comme disponible ?')) return
    
    setIsDeleting(mediaId)
    try {
      const res = await fetch(`/api/media/${tmdbId}/manage?action=status&targetId=${mediaId}&type=${mediaType}`, {
        method: 'POST'
      })
      if (res.ok) {
        fetchMediaInfo()
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsDeleting(null)
    }
  }

  if (!isOpen) return null

  const requests = Array.isArray(mediaInfo?.mediaInfo?.requests) ? mediaInfo.mediaInfo.requests : []
  const mediaStatus = mediaInfo?.mediaInfo?.status
  const hasMediaInfo = !!mediaInfo?.mediaInfo && typeof mediaInfo.mediaInfo === 'object'
  const internalMediaId = mediaInfo?.mediaInfo?.id

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
              <button onClick={fetchMediaInfo} className="block mx-auto text-indigo-400 hover:underline text-sm">Réessayer</button>
            </div>
          ) : !hasMediaInfo && requests.length === 0 ? (
            <div className="py-10 text-center space-y-4">
              <div className="bg-indigo-500/10 text-indigo-400 p-4 rounded-xl border border-indigo-500/20 inline-block">
                <Settings className="h-8 w-8 mx-auto mb-2" />
                <p>Aucune donnée de gestion trouvée pour ce média.</p>
                <p className="text-xs text-gray-500 mt-2">Le média a probablement été supprimé de Jellyseerr.</p>
              </div>
              <button onClick={onClose} className="block mx-auto text-indigo-400 hover:underline text-sm">Fermer</button>
            </div>
          ) : (
            <>
              {/* Requests Section */}
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <User className="h-5 w-5 text-indigo-400" />
                  Demandes
                </h3>
                <div className="space-y-3">
                  {requests.length > 0 ? (
                    requests.map((req: any) => {
                      if (!req) return null;
                      return (
                        <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
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
                                req.status === 2 ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                              }`}>
                                {req.status === 2 ? 'Validé' : 'En attente'}
                              </span>
                              {Array.isArray(req.seasons) && req.seasons.length > 0 && (
                                <div className="flex gap-1">
                                  {req.seasons.map((s: any) => {
                                    if (!s) return null;
                                    return (
                                      <span key={s.id} className="w-5 h-5 flex items-center justify-center bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-full border border-indigo-500/30">
                                        {s.seasonNumber}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleDeleteRequest(req.id)}
                            disabled={isDeleting === req.id}
                            className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            {isDeleting === req.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm italic py-4 text-center bg-white/5 rounded-xl border border-dashed border-white/10">Aucune demande active.</p>
                  )}
                </div>
              </section>

              {/* Media Management Section */}
              {hasMediaInfo && (
                <section className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    Média(s)
                  </h3>
                  <div className="grid gap-3">
                    {/* Actions dynamically based on status */}
                    {mediaInfo?.mediaInfo?.externalServiceUrl ? (
                      <a 
                        href={mediaInfo.mediaInfo.externalServiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all"
                      >
                          <ExternalLink className="h-4 w-4" />
                          Ouvrir dans {mediaType === 'tv' ? 'Sonarr' : 'Radarr'}
                      </a>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 opacity-50 border border-white/10 rounded-xl text-sm font-bold text-white cursor-not-allowed">
                          <ExternalLink className="h-4 w-4" />
                          Lien {mediaType === 'tv' ? 'Sonarr' : 'Radarr'} non disponible
                      </div>
                    )}
                    
                    <button 
                      onClick={() => internalMediaId && handleDeleteMedia(internalMediaId, true)}
                      disabled={isDeleting === internalMediaId}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-bold text-red-500 transition-all"
                    >
                        {isDeleting === internalMediaId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Supprimer de {mediaType === 'tv' ? 'Sonarr' : 'Radarr'}
                    </button>
                    <p className="text-[10px] text-gray-500 italic text-center px-4">* Cela supprimera irréversiblement ce(tte) {mediaType === 'tv' ? 'série' : 'film'} de {mediaType === 'tv' ? 'Sonarr' : 'Radarr'}, y compris tous les fichiers.</p>
                  </div>
                </section>
              )}

              {/* Advanced Actions */}
              {hasMediaInfo && (
                <section className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-lg font-bold text-white">Avancé</h3>
                  <div className="grid gap-3">
                    <button 
                      onClick={() => internalMediaId && handleMarkAsAvailable(internalMediaId)}
                      disabled={isDeleting === internalMediaId}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 rounded-xl text-sm font-bold text-green-500 transition-all"
                    >
                        {isDeleting === internalMediaId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Marquer comme disponible
                    </button>
                    <button 
                      onClick={() => internalMediaId && handleDeleteMedia(internalMediaId, false)}
                      disabled={isDeleting === internalMediaId}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-xl text-sm font-bold text-red-500 transition-all"
                    >
                        {isDeleting === internalMediaId ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                        Effacer les données
                    </button>
                    <p className="text-[10px] text-gray-500 italic text-center px-4">* Ceci supprimera de manière irréversible toutes les données de ce(tte) {mediaType === 'tv' ? 'série' : 'film'} dans Jellyseerr. Si cet élément existe dans votre bibliothèque Emby, les informations sur le média seront recréées lors de la prochaine analyse.</p>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
