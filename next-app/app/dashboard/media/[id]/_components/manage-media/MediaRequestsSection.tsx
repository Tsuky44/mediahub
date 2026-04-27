'use client'

import { Loader2, Trash2, User } from 'lucide-react'
import { MediaRequestRow } from './MediaRequestRow'
import type { ManageMediaRequest, ManageMediaType } from '../../_types/manage-media'

interface MediaRequestsSectionProps {
    requests: ManageMediaRequest[]
    mediaType: ManageMediaType
    selectedRequests: number[]
    isDeleting: string | null
    onToggleSelection: (id: number) => void
    onDelete: (id: number | number[]) => void
}

/** Section des demandes locales : titre, bouton bulk delete, liste des MediaRequestRow. */
export function MediaRequestsSection({
    requests,
    mediaType,
    selectedRequests,
    isDeleting,
    onToggleSelection,
    onDelete,
}: MediaRequestsSectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-indigo-400" />
                    Demandes Locales
                </h3>

                {selectedRequests.length > 0 && (
                    <button
                        onClick={() => onDelete(selectedRequests)}
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
                    requests.map((req) =>
                        req ? (
                            <MediaRequestRow
                                key={req.id}
                                request={req}
                                mediaType={mediaType}
                                isSelected={selectedRequests.includes(req.id)}
                                isDeleting={!!isDeleting?.split(',').includes(req.id.toString())}
                                onToggleSelection={onToggleSelection}
                                onDelete={onDelete}
                            />
                        ) : null,
                    )
                ) : (
                    <p className="text-gray-500 text-sm italic py-4 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                        Aucune demande locale active.
                    </p>
                )}
            </div>
        </section>
    )
}
