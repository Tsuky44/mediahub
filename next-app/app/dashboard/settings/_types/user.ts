export interface User {
    id: number
    name: string | null
    email: string | null
    image: string | null
    role: string
    roleId: string | null
    roleRef: { name: string } | null
    embyUserId: string | null
    plexUserId: string | null
    jellyfinUserId: string | null
    telegramChatId: string | null
    whatsappNumber: string | null
    discordUserId: string | null
    discordWebhook: string | null
    customWebhook: string | null
}

export interface UserRole {
    id: string
    name: string
}

export type ProviderFilter = 'all' | 'emby' | 'plex' | 'jellyfin' | 'local'

export type SyncProvider = 'emby' | 'plex' | 'jellyfin'

export interface CreateUserPayload {
    name: string
    email: string
    password: string
    roleId: string
    whatsappNumber: string
}
