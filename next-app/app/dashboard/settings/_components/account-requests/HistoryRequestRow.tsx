'use client'

import { Loader2, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { AccountRequest } from '../../_types/account-requests'

interface HistoryRequestRowProps {
    request: AccountRequest
    isProcessing: boolean
    onDelete: (id: string) => void
}

export default function HistoryRequestRow({
    request,
    isProcessing,
    onDelete,
}: HistoryRequestRowProps) {
    const isApproved = request.status === 'APPROVED'

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 items-center">
            <div className="flex items-center gap-4">
                <div
                    className={`w-2 h-2 rounded-full ${
                        isApproved ? 'bg-green-500' : 'bg-red-500'
                    }`}
                />
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{request.firstName}</span>
                        <span className="text-sm text-gray-400">({request.email})</span>
                    </div>
                    <div className="text-xs text-gray-500 flex gap-2">
                        <span>
                            Traité{' '}
                            {formatDistanceToNow(new Date(request.updatedAt), {
                                addSuffix: true,
                                locale: fr,
                            })}
                        </span>
                        {request.inviter && <span>• Invité par {request.inviter}</span>}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                        isApproved
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}
                >
                    {isApproved ? 'APPROUVÉ' : 'REJETÉ'}
                </span>

                <button
                    onClick={() => onDelete(request.id)}
                    disabled={isProcessing}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    title="Supprimer définitivement"
                >
                    {isProcessing ? (
                        <Loader2 className="animate-spin" size={16} />
                    ) : (
                        <Trash2 size={16} />
                    )}
                </button>
            </div>
        </div>
    )
}
