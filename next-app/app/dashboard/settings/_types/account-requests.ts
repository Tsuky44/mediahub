export type AccountRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface AccountRequest {
    id: string
    email: string
    firstName: string
    inviter: string | null
    status: AccountRequestStatus
    createdAt: string | Date
    updatedAt: string | Date
}

/**
 * Minimal subset of a user record used by the approval modal to populate
 * the "copy permissions from" dropdown. The parent passes `dbUsers` as
 * `any[]`, so the orchestrator narrows it to this shape via a local cast.
 */
export interface TemplateUserOption {
    id: number | string
    name: string | null
    embyUserId: string | null
}

export interface AccountRequestsManagementProps {
    requests: AccountRequest[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    users?: any[]
}
