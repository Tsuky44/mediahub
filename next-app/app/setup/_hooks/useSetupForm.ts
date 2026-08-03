'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

type ServerType = 'emby' | 'jellyfin'

interface FormData {
  server_type: ServerType
  emby_url: string
  emby_api_key: string
  jellyfin_url: string
  jellyfin_api_key: string
}

export function useSetupForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'configure' | 'restore'>('configure')

  const [formData, setFormData] = useState<FormData>({
    server_type: 'emby',
    emby_url: '',
    emby_api_key: '',
    jellyfin_url: '',
    jellyfin_api_key: '',
  })

  const [restorePassword, setRestorePassword] = useState('')
  const [showRestorePassword, setShowRestorePassword] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const setServerType = (type: ServerType) => {
    setFormData(prev => ({ ...prev, server_type: type }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      const providerName = formData.server_type === 'jellyfin' ? 'Jellyfin' : 'Emby'
      toast.success(`Configuration terminée ! Connectez-vous avec votre compte ${providerName}.`)
      router.push('/login')
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!restoreFile || !restorePassword) {
      toast.error('Veuillez sélectionner un fichier et entrer le mot de passe')
      return
    }

    setLoading(true)
    try {
      const text = await restoreFile.text()

      const res = await fetch('/api/setup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: text, password: restorePassword }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erreur lors de la restauration')
      }

      toast.success('Restauration terminée avec succès !')
      router.push('/login')
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    mode,
    setMode,
    formData,
    setServerType,
    restorePassword,
    showRestorePassword,
    setShowRestorePassword,
    restoreFile,
    handleChange,
    handleFileChange,
    handleSubmit,
    handleRestore,
    setRestorePassword,
  }
}
