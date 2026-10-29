export interface SettingsFormData {
    qbittorrent_url: string
    qbittorrent_username: string
    qbittorrent_password: string
    qbittorrent_poll_interval: string
    prowlarr_url: string
    prowlarr_api_key: string
    // Storage settings (SMB or FTP)
    storage_protocol: 'smb' | 'ftp' | 'local'
    storage_host: string
    storage_port: string
    storage_username: string
    storage_password: string
    storage_share: string  // SMB share name only (not used for FTP)
    storage_root_path: string  // Restrict access to this subfolder (FTP & SMB)
    storage_secure: string  // 'true' for FTPS, 'false' for plain FTP
    // Legacy SMB settings (for migration)
    smb_host: string
    smb_username: string
    smb_password: string
    smb_share: string
    smb_path: string
    radarr_url: string
    radarr_api_key: string
    sonarr_url: string
    sonarr_api_key: string
    sorraa_url: string
    sorraa_api_key: string
    /** Gestionnaire de telechargement par type de media : 'arr' (Radarr/Sonarr) ou 'sorraa' */
    download_manager_movie: string
    download_manager_tv: string
    jellyseerr_url: string
    jellyseerr_api_key: string
    emby_url: string
    emby_api_key: string
    plex_url: string
    plex_token: string
    jellyfin_url: string
    jellyfin_api_key: string
    auth_emby_enabled: boolean
    auth_plex_enabled: boolean
    auth_jellyfin_enabled: boolean
    auth_onyx_enabled: boolean
    auth_onyx_auto_create: boolean
    onyx_url: string
    auth_local_enabled: boolean
    unraid_url: string
    unraid_api_key: string
    request_all_seasons_enabled: boolean
    webhook_sonarr_secret?: string
    webhook_radarr_secret?: string
    webhook_sorraa_secret?: string
    webhook_emby_secret?: string
}

export type TabType = 'media' | 'downloads' | 'automation' | 'storage' | 'maintenance'
