'use client'

import { CheckCircle2, ExternalLink, Eye, FileText, Loader2, Trash2 } from 'lucide-react'
import type { ManageMediaAvailability, ManageMediaType } from '../../_types/manage-media'

interface MediaServiceStatusSectionProps {
    availability: ManageMediaAvailability
    mediaType: ManageMediaType
    externalServiceUrl?: string
    isDeleting: string | null
    onMarkAsAvailable: (mediaId: number | undefined) => void
    onDeleteFromService: (mediaId: number | undefined) => void
}

const STATUS_LABELS: Record<string, string> = {
    available: 'Disponible',
    partial: 'Partiellement disponible',
    pending: 'En attente',
    processing: 'En attente',
}

function getStatusClasses(status: string): string {
    if (status === 'available') return 'bg-green-500/20 text-green-500'
    if (status === 'partial') return 'bg-blue-500/20 text-blue-500'
    return 'bg-yellow-500/20 text-yellow-500'
}

/** Section statut Sonarr/Radarr avec actions (lien externe, marquer dispo, supprimer). */
export function MediaServiceStatusSection({
    availability,
    mediaType,
    externalServiceUrl,
    isDeleting,
    onMarkAsAvailable,
    onDeleteFromService,
}: MediaServiceStatusSectionProps) {
    const status = String(availability.status)
    const serviceName = mediaType === 'tv' ? 'Sonarr' : 'Radarr'
    const isAvailable = status === 'available'
    const statusLabel = STATUS_LABELS[status] || 'Inconnu'
    const statusClasses = getStatusClasses(status)
    const detailsId = availability.details?.id
    const isDeletingThis = isDeleting === detailsId?.toString()

    return (
        <section className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-400" />
                Statut {serviceName}
            </h3>
            <div className="grid gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${statusClasses}`}>
                            {isAvailable ? <CheckCircle2 className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white tracking-tight">
                                {availability.details?.title || 'Titre inconnu'}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${statusClasses}`}>
                                    {statusLabel}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">ID: {detailsId}</span>
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
                                title={`Ouvrir dans ${serviceName}`}
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                        )}
                        {!isAvailable && (
                            <button
                                onClick={() => onMarkAsAvailable(detailsId)}
                                className="p-2.5 text-gray-400 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all"
                                title="Marquer comme disponible localement"
                            >
                                <CheckCircle2 className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            onClick={() => onDeleteFromService(detailsId)}
                            disabled={isDeletingThis}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Supprimer du service et les fichiers"
                        >
                            {isDeletingThis ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    )
}
