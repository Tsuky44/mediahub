'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SettingsFormData, TabType } from '../types'

const initialFormData: SettingsFormData = {
  qbittorrent_url: '',
  qbittorrent_username: '',
  qbittorrent_password: '',
  qbittorrent_poll_interval: '5',
  prowlarr_url: '',
  prowlarr_api_key: '',
  storage_protocol: 'smb',
  storage_host: '',
  storage_port: '',
  storage_username: '',
  storage_password: '',
  storage_share: '',
  storage_root_path: '',
  storage_secure: 'false',
  smb_host: '',
  smb_username: '',
  smb_password: '',
  smb_share: '',
  smb_path: '',
  radarr_url: '',
  radarr_api_key: '',
  sonarr_url: '',
  sonarr_api_key: '',
  jellyseerr_url: '',
  jellyseerr_api_key: '',
  emby_url: '',
  emby_api_key: '',
  plex_url: '',
  plex_token: '',
  jellyfin_url: '',
  jellyfin_api_key: '',
  auth_emby_enabled: true,
  auth_plex_enabled: false,
  auth_jellyfin_enabled: false,
  auth_local_enabled: true,
  unraid_url: '',
  unraid_api_key: '',
  docker_host: '',
  request_all_seasons_enabled: false,
  webhook_sonarr_secret: '',
  webhook_radarr_secret: '',
  webhook_emby_secret: '',
}

export function useSettingsForm(settings: Partial<SettingsFormData>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (tab && ['media', 'downloads', 'automation', 'storage', 'maintenance'].includes(tab)) {
      return tab as TabType
    }
    return 'media'
  })

  useEffect(() => {
    if (tab && ['media', 'downloads', 'automation', 'storage', 'maintenance'].includes(tab)) {
      setActiveTab(tab as TabType)
    }
  }, [tab])

  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState<SettingsFormData>(initialFormData)

  // Reset loading state when changing tabs to prevent visual glitch
  useEffect(() => {
    setLoading(false)
  }, [activeTab])

  useEffect(() => {
    if (settings) {
      const safeSettings = { ...settings } as any

      const booleanFields = [
        'auth_emby_enabled',
        'auth_plex_enabled',
        'auth_jellyfin_enabled',
        'auth_local_enabled',
        'request_all_seasons_enabled',
      ]

      booleanFields.forEach(field => {
        if (typeof safeSettings[field] === 'string') {
          safeSettings[field] = safeSettings[field] === 'true'
        }
      })

      setFormData(prev => ({
        ...initialFormData,
        ...safeSettings,
      } as SettingsFormData))
    }
    setStatusMessage(null)
  }, [settings])

  const updateField = (field: keyof SettingsFormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage(null)

    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' })
        router.refresh()
      } else {
        const data = await res.json()
        setStatusMessage({ type: 'error', text: data.error || 'Une erreur est survenue' })
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Impossible de contacter le serveur' })
    } finally {
      setLoading(false)
    }
  }

  return {
    activeTab,
    setActiveTab,
    formData,
    loading,
    statusMessage,
    updateField,
    handleSubmit,
  }
}
