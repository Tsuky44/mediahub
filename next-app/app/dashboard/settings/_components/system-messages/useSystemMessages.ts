'use client'

import { useState, useEffect } from 'react'

interface SystemMessageState {
  content: string
  enabled: boolean
  welcomeEnabled: boolean
  bannerContent: string
  bannerEnabled: boolean
  bannerSpeed: number
  version: string
}

interface SaveStatus {
  type: 'success' | 'error'
  message: string
}

export function useSystemMessages() {
  const [content, setContent] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [welcomeEnabled, setWelcomeEnabled] = useState(true)
  const [bannerContent, setBannerContent] = useState('')
  const [bannerEnabled, setBannerEnabled] = useState(false)
  const [bannerSpeed, setBannerSpeed] = useState(20)
  const [version, setVersion] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<SaveStatus | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/system-message')
      if (!res.ok) throw new Error('Impossible de récupérer les paramètres')
      const data = await res.json()
      setContent(data.content)
      setEnabled(data.enabled)
      setWelcomeEnabled(data.welcomeEnabled ?? true)
      setBannerContent(data.bannerContent || '')
      setBannerEnabled(data.bannerEnabled || false)
      setBannerSpeed(data.bannerSpeed || 20)
      setVersion(data.version)
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setStatus({ type: 'error', message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      setStatus(null)

      const res = await fetch('/api/admin/system-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, enabled, welcomeEnabled, bannerContent, bannerEnabled, bannerSpeed }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      const data = await res.json()
      setVersion(data.version)
      setStatus({ type: 'success', message: 'Messages système mis à jour avec succès' })
      setTimeout(() => setStatus(null), 3000)
    } catch (error: unknown) {
      console.error(error)
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      setStatus({ type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  return {
    content, setContent,
    enabled, setEnabled,
    welcomeEnabled, setWelcomeEnabled,
    bannerContent, setBannerContent,
    bannerEnabled, setBannerEnabled,
    bannerSpeed, setBannerSpeed,
    version,
    loading,
    saving,
    status,
    handleSave,
  }
}
