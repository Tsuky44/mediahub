'use client'

import { Check, Loader2, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import type { AccountRequest } from '../../_types/account-requests'

interface PendingRequestCardProps {
    request: AccountRequest
    isProcessing: boolean
    onApprove: (request: AccountRequest) => void
    onReject: (id: string) => void
    onDelete: (id: string) => void
}

export default function PendingRequestCard({
    request,
    isProcessing,
    onApprove,
    onReject,
    onDelete,
}: PendingRequestCardProps) {
    const spinner = <Loader2 className="animate-spin" size={20} />

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row justify-between gap-4 transition-all hover:border-white/20">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-white">{request.firstName}</span>
                    <span className="text-sm text-gray-400 bg-black/30 px-2 py-0.5 rounded">
                        {request.email}
                    </span>
                </div>

                {request.inviter && (
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-gray-300 text-sm italic">
                        Invité par:{' '}
                        <span className="text-indigo-400 font-medium">{request.inviter}</span>
                    </div>
                )}

                <div className="text-xs text-gray-500">
                    Demandé{' '}
                    {formatDistanceToNow(new Date(request.createdAt), {
                        addSuffix: true,
                        locale: fr,
                    })}
                </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
                <button
                    onClick={() => onReject(request.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? spinner : <X size={20} />}
                    Refuser
                </button>
                <button
                    onClick={() => onDelete(request.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-500/10 hover:bg-red-500/20 text-gray-500 hover:text-red-500 border border-gray-500/20 hover:border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Supprimer la demande"
                >
                    {isProcessing ? spinner : <Trash2 size={20} />}
                </button>
                <button
                    onClick={() => onApprove(request)}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? spinner : <Check size={20} />}
                    Approuver
                </button>
            </div>
        </div>
    )
}
