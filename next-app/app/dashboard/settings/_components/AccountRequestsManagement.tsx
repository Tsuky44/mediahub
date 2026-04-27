'use client'

import { useMemo } from 'react'

import { useAccountRequests } from '../_hooks/useAccountRequests'
import PendingRequestsSection from './account-requests/PendingRequestsSection'
import ApprovalModal from './account-requests/ApprovalModal'
import HistorySection from './account-requests/HistorySection'
import type {
    AccountRequestsManagementProps,
    TemplateUserOption,
} from '../_types/account-requests'

export default function AccountRequestsManagement({
    requests: initialRequests,
    users = [],
}: AccountRequestsManagementProps) {
    const {
        pendingRequests,
        historyRequests,
        processingId,
        selectedRequest,
        customName,
        templateUserId,
        setCustomName,
        setTemplateUserId,
        openApprovalModal,
        closeApprovalModal,
        confirmApprove,
        reject,
        remove,
    } = useAccountRequests({ initialRequests })

    // Narrow the loose `any[]` from the parent into the minimal shape used by
    // the approval modal, and keep only users that are actually linked to an
    // Emby account (potential permission templates).
    const templateUsers = useMemo<TemplateUserOption[]>(
        () =>
            (users as TemplateUserOption[]).filter(
                u => u && typeof u.embyUserId === 'string' && u.embyUserId.length > 0
            ),
        [users]
    )

    return (
        <div className="space-y-8">
            <PendingRequestsSection
                requests={pendingRequests}
                processingId={processingId}
                onApprove={openApprovalModal}
                onReject={reject}
                onDelete={remove}
            />

            {selectedRequest && (
                <ApprovalModal
                    request={selectedRequest}
                    templateUsers={templateUsers}
                    customName={customName}
                    templateUserId={templateUserId}
                    isProcessing={!!processingId}
                    onCustomNameChange={setCustomName}
                    onTemplateUserIdChange={setTemplateUserId}
                    onCancel={closeApprovalModal}
                    onConfirm={confirmApprove}
                />
            )}

            <HistorySection
                requests={historyRequests}
                processingId={processingId}
                onDelete={remove}
            />
        </div>
    )
}
