'use client'

import { useCallback, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'

import {
    approveAccountRequestAction,
    rejectAccountRequestAction,
    deleteAccountRequestAction,
} from '../actions'
import type { AccountRequest } from '../_types/account-requests'

interface UseAccountRequestsOptions {
    initialRequests: AccountRequest[]
}

interface UseAccountRequestsResult {
    requests: AccountRequest[]
    pendingRequests: AccountRequest[]
    historyRequests: AccountRequest[]
    processingId: string | null
    selectedRequest: AccountRequest | null
    customName: string
    templateUserId: string
    setCustomName: (value: string) => void
    setTemplateUserId: (value: string) => void
    openApprovalModal: (request: AccountRequest) => void
    closeApprovalModal: () => void
    confirmApprove: () => Promise<void>
    reject: (id: string) => Promise<void>
    remove: (id: string) => Promise<void>
}

/**
 * Owns the account requests list and the approval modal state.
 *
 * The hook keeps three optimistic-update flows (approve, reject, delete)
 * that mirror the original component verbatim:
 * - approve sets status='APPROVED' on the local list and clears the modal
 * - reject sets status='REJECTED' on the local list
 * - delete removes the entry from the local list (gated by a confirm())
 *
 * Errors are surfaced via toast notifications; state mutations only happen
 * after a successful server response.
 */
export function useAccountRequests({
    initialRequests,
}: UseAccountRequestsOptions): UseAccountRequestsResult {
    const [requests, setRequests] = useState<AccountRequest[]>(initialRequests)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null)
    const [templateUserId, setTemplateUserId] = useState<string>('')
    const [customName, setCustomName] = useState<string>('')

    const openApprovalModal = useCallback((request: AccountRequest) => {
        setSelectedRequest(request)
        setTemplateUserId('')
        setCustomName(request.firstName)
    }, [])

    const closeApprovalModal = useCallback(() => {
        setSelectedRequest(null)
    }, [])

    const confirmApprove = useCallback(async () => {
        if (!selectedRequest) return

        setProcessingId(selectedRequest.id)
        try {
            const result = await approveAccountRequestAction(
                selectedRequest.id,
                templateUserId || undefined,
                customName
            )
            if (result.success) {
                toast.success(result.message)
                setRequests(prev =>
                    prev.map(req =>
                        req.id === selectedRequest.id ? { ...req, status: 'APPROVED' } : req
                    )
                )
                setSelectedRequest(null)
            } else {
                toast.error(result.message || 'Une erreur est survenue')
            }
        } catch {
            toast.error('Erreur de communication avec le serveur')
        } finally {
            setProcessingId(null)
        }
    }, [selectedRequest, templateUserId, customName])

    const reject = useCallback(async (requestId: string) => {
        setProcessingId(requestId)
        try {
            const result = await rejectAccountRequestAction(requestId)
            if (result.success) {
                toast.success(result.message)
                setRequests(prev =>
                    prev.map(req =>
                        req.id === requestId ? { ...req, status: 'REJECTED' } : req
                    )
                )
            } else {
                toast.error(result.message || 'Une erreur est survenue')
            }
        } catch {
            toast.error('Erreur de communication avec le serveur')
        } finally {
            setProcessingId(null)
        }
    }, [])

    const remove = useCallback(async (requestId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return

        setProcessingId(requestId)
        try {
            const result = await deleteAccountRequestAction(requestId)
            if (result.success) {
                toast.success(result.message)
                setRequests(prev => prev.filter(req => req.id !== requestId))
            } else {
                toast.error(result.message || 'Une erreur est survenue')
            }
        } catch {
            toast.error('Erreur de communication avec le serveur')
        } finally {
            setProcessingId(null)
        }
    }, [])

    const pendingRequests = useMemo(
        () => requests.filter(r => r.status === 'PENDING'),
        [requests]
    )

    const historyRequests = useMemo(
        () =>
            requests
                .filter(r => r.status !== 'PENDING')
                .sort(
                    (a, b) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                ),
        [requests]
    )

    return {
        requests,
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
    }
}
