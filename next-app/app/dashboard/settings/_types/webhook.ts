export type WebhookType = 'discord' | 'evolution' | 'custom'

export type WebhookEventId =
    | 'media_request'
    | 'request_approved'
    | 'media_grabbed'
    | 'media_downloaded'
    | 'media_available'
    | 'media_deleted'
    | 'account_request'
    | 'user_created'

export type WebhookTestType = 'default' | 'movie' | 'tv'

export interface WebhookEvent {
    id: WebhookEventId
    label: string
}

export interface Webhook {
    id: string
    name: string
    type: WebhookType
    url?: string
    events?: string[]
    enabled: boolean
    templates?: Record<string, string>
    includeImage?: Record<string, boolean>
    notifyRequester?: boolean
    targetUsers?: string[]

    // Evolution API specific
    evolutionUrl?: string
    evolutionInstance?: string
    evolutionApiKey?: string
    whatsappNumber?: string
}

export interface WebhookTestResult {
    id: string
    success: boolean
    message?: string
}

export interface UserOption {
    id: number | string
    name?: string | null
    email?: string | null
}
