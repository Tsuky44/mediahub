'use client'

import { AlertTriangle, Loader2, Settings, X } from 'lucide-react'
import { useManageMedia } from './_hooks/useManageMedia'
import { MediaRequestsSection } from './_components/manage-media/MediaRequestsSection'
import { MediaServiceStatusSection } from './_components/manage-media/MediaServiceStatusSection'
import type { ManageMediaType } from './_types/manage-media'

interface ManageMediaModalProps {
    isOpen: boolean
    onClose: () => void
    tmdbId: number
    mediaType: ManageMediaType
    title: string
}

/**
 * Modal de gestion d'un media : liste des demandes locales (suppression unitaire/bulk),
 * statut Sonarr/Radarr (lien externe, marquer dispo, supprimer du service).
 */
export function ManageMediaModal({ isOpen, onClose, tmdbId, mediaType, title }: ManageMediaModalProps) {
    const {
        loading,
        error,
        mediaInfo,
        isDeleting,
        selectedRequests,
        toggleRequestSelection,
        fetchMediaInfo,
        deleteRequest,
        deleteMedia,
        markAsAvailable,
    } = useManageMedia(isOpen, tmdbId, mediaType, onClose)

    if (!isOpen) return null

    const requests = Array.isArray(mediaInfo?.requests) ? mediaInfo.requests : []
    const availability = mediaInfo?.availability
    const hasMediaInService = availability?.status !== 'unknown'
    const externalServiceUrl = mediaInfo?.externalServiceUrl
    const serviceName = mediaType === 'tv' ? 'Sonarr' : 'Radarr'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-6xl bg-[#1f2121] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col h-[85vh] max-h-[90vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-2xl font-bold text-indigo-400">
                            Gérer {mediaType === 'tv' ? 'Série' : 'Film'}
                        </h2>
                        <p className="text-gray-400 text-sm font-medium">{title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

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
                            <button
                                onClick={() => fetchMediaInfo(true)}
                                className="block mx-auto text-indigo-400 hover:underline text-sm"
                            >
                                Réessayer
                            </button>
                        </div>
                    ) : !hasMediaInService && requests.length === 0 ? (
                        <div className="py-10 text-center space-y-4">
                            <div className="bg-indigo-500/10 text-indigo-400 p-4 rounded-xl border border-indigo-500/20 inline-block">
                                <Settings className="h-8 w-8 mx-auto mb-2" />
                                <p>Aucune donnée de gestion trouvée pour ce média.</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Le média n&apos;est pas présent dans {serviceName} et aucune demande locale n&apos;a été trouvée.
                                </p>
                            </div>
                            <button onClick={onClose} className="block mx-auto text-indigo-400 hover:underline text-sm">
                                Fermer
                            </button>
                        </div>
                    ) : (
                        <>
                            <MediaRequestsSection
                                requests={requests}
                                mediaType={mediaType}
                                selectedRequests={selectedRequests}
                                isDeleting={isDeleting}
                                onToggleSelection={toggleRequestSelection}
                                onDelete={deleteRequest}
                            />

                            {hasMediaInService && availability && (
                                <MediaServiceStatusSection
                                    availability={availability}
                                    mediaType={mediaType}
                                    externalServiceUrl={externalServiceUrl}
                                    isDeleting={isDeleting}
                                    onMarkAsAvailable={markAsAvailable}
                                    onDeleteFromService={(id) => deleteMedia(id, true)}
                                />
                            )}
                        </>
                    )}
                </div>

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
