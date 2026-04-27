export type ManageMediaType = 'movie' | 'tv'

export type ServiceAvailabilityStatus = 'available' | 'partial' | 'pending' | 'processing' | 'unknown'

export interface ManageMediaRequest {
    id: number
    status: number
    createdAt: string
    seasons?: number[]
    requestedBy?: {
        displayName?: string
        email?: string
    }
}

export interface ManageMediaAvailability {
    status: ServiceAvailabilityStatus | string
    details?: {
        id?: number
        title?: string
    }
}

export interface ManageMediaInfo {
    requests?: ManageMediaRequest[]
    availability?: ManageMediaAvailability
    externalServiceUrl?: string
}
