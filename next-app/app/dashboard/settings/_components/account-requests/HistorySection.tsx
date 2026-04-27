'use client'

import HistoryRequestRow from './HistoryRequestRow'
import type { AccountRequest } from '../../_types/account-requests'

const HISTORY_LIMIT = 10

interface HistorySectionProps {
    requests: AccountRequest[]
    processingId: string | null
    onDelete: (id: string) => void
}

export default function HistorySection({
    requests,
    processingId,
    onDelete,
}: HistorySectionProps) {
    const visibleRequests = requests.slice(0, HISTORY_LIMIT)

    return (
        <div className="space-y-4 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold text-gray-400 flex items-center gap-2">
                Historique récent
            </h3>

            <div className="space-y-2">
                {visibleRequests.map(request => (
                    <HistoryRequestRow
                        key={request.id}
                        request={request}
                        isProcessing={processingId === request.id}
                        onDelete={onDelete}
                    />
                ))}

                {requests.length === 0 && (
                    <div className="text-gray-500 italic text-sm">
                        Aucun historique récent.
                    </div>
                )}
            </div>
        </div>
    )
}
