'use client'

import { Calendar, CheckCircle2, Loader2, Trash2, User } from 'lucide-react'
import type { ManageMediaRequest, ManageMediaType } from '../../_types/manage-media'

interface MediaRequestRowProps {
    request: ManageMediaRequest
    mediaType: ManageMediaType
    isSelected: boolean
    isDeleting: boolean
    onToggleSelection: (id: number) => void
    onDelete: (id: number) => void
}

const REQUEST_STATUS_AVAILABLE = 5

/** Ligne d'une demande locale avec checkbox de selection et bouton supprimer. */
export function MediaRequestRow({
    request,
    mediaType,
    isSelected,
    isDeleting,
    onToggleSelection,
    onDelete,
}: MediaRequestRowProps) {
    const isAvailable = request.status === REQUEST_STATUS_AVAILABLE
    const requesterName = request.requestedBy?.displayName || request.requestedBy?.email || 'Inconnu'
    const dateLabel = request.createdAt
        ? new Date(request.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : 'Date inconnue'

    return (
        <div
            onClick={() => onToggleSelection(request.id)}
            className={`group cursor-pointer bg-white/5 border rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all ${
                isSelected ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10'
            }`}
        >
            <div className="flex items-center gap-4">
                <div
                    className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-white/20 group-hover:border-white/40'
                    }`}
                >
                    {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <User className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">{requesterName}</p>
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider">
                                <Calendar className="h-3 w-3" />
                                {dateLabel}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                isAvailable ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                            }`}
                        >
                            {isAvailable ? 'Disponible' : 'En cours'}
                        </span>
                        {mediaType === 'tv' && request.seasons && request.seasons.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-indigo-500/20 text-indigo-400">
                                Saisons: {request.seasons.join(', ')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete(request.id)
                }}
                disabled={isDeleting}
                className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
            </button>
        </div>
    )
}
