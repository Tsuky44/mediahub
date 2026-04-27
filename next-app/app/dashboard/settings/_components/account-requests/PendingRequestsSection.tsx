'use client'

import { Clock } from 'lucide-react'

import PendingRequestCard from './PendingRequestCard'
import type { AccountRequest } from '../../_types/account-requests'

interface PendingRequestsSectionProps {
    requests: AccountRequest[]
    processingId: string | null
    onApprove: (request: AccountRequest) => void
    onReject: (id: string) => void
    onDelete: (id: string) => void
}

export default function PendingRequestsSection({
    requests,
    processingId,
    onApprove,
    onReject,
    onDelete,
}: PendingRequestsSectionProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="text-yellow-500" />
                Demandes en attente
                <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded-full">
                    {requests.length}
                </span>
            </h3>

            {requests.length === 0 ? (
                <div className="text-gray-400 italic p-4 border border-white/5 rounded-lg bg-white/5 text-center">
                    Aucune demande en attente.
                </div>
            ) : (
                <div className="grid gap-4">
                    {requests.map(request => (
                        <PendingRequestCard
                            key={request.id}
                            request={request}
                            isProcessing={processingId === request.id}
                            onApprove={onApprove}
                            onReject={onReject}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
