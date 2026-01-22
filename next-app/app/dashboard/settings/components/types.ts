export interface SettingsFormData {
    qbittorrent_url: string
    qbittorrent_username: string
    qbittorrent_password: string
    prowlarr_url: string
    prowlarr_api_key: string
    smb_host: string
    smb_username: string
    smb_password: string
    smb_share: string
    smb_path: string
    radarr_url: string
    radarr_api_key: string
    sonarr_url: string
    sonarr_api_key: string
    jellyseerr_url: string
    jellyseerr_api_key: string
    emby_url: string
    emby_api_key: string
    plex_url: string
    plex_token: string
    jellyfin_url: string
    jellyfin_api_key: string
    unraid_url: string
    unraid_api_key: string
    docker_host: string
    type: string
}

export type TabType = 'media' | 'downloads' | 'automation' | 'storage' | 'maintenance'
