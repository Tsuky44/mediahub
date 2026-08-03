'use client'

import { useState } from 'react'
import { testStorageConnection, testUnraidConnection } from '../../../downloads/file-actions'
import { testUnraidDebugAction } from '../../actions'
import type { SettingsFormData } from '../types'

export interface TestResult {
  success: boolean
  message: string
}

export function useStorageTests(formData: SettingsFormData) {
  const protocol = formData.storage_protocol || 'smb'

  const [storageLoading, setStorageLoading] = useState(false)
  const [storageResult, setStorageResult] = useState<TestResult | null>(null)

  const [unraidLoading, setUnraidLoading] = useState(false)
  const [unraidResult, setUnraidResult] = useState<TestResult | null>(null)

  const handleTestStorage = async () => {
    setStorageLoading(true)
    setStorageResult(null)
    try {
      const res = await testStorageConnection({
        protocol: protocol as 'smb' | 'ftp' | 'local',
        host: formData.storage_host,
        port: formData.storage_port,
        share: protocol === 'smb' ? formData.storage_share : '',
        user: formData.storage_username,
        pass: formData.storage_password,
        rootPath: formData.storage_root_path,
        secure: protocol === 'ftp' ? formData.storage_secure === 'true' : undefined,
      })
      setStorageResult({
        success: res.success,
        message: res.success ? 'Connexion réussie' : (res as { error?: string }).error || 'Échec de la connexion',
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue'
      setStorageResult({ success: false, message })
    } finally {
      setStorageLoading(false)
    }
  }

  const handleTestUnraid = async () => {
    setUnraidLoading(true)
    setUnraidResult(null)
    try {
      const res = await testUnraidConnection(formData.unraid_url, formData.unraid_api_key)
      if (res.success) {
        setUnraidResult({ success: true, message: 'Connexion réussie' })
      } else {
        const debugRes = await testUnraidDebugAction()
        setUnraidResult({
          success: debugRes.success,
          message: debugRes.message || (debugRes.success ? 'Connexion réussie' : 'Échec de la connexion'),
        })
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue'
      setUnraidResult({ success: false, message })
    } finally {
      setUnraidLoading(false)
    }
  }

  return {
    storageLoading,
    storageResult,
    unraidLoading,
    unraidResult,
    handleTestStorage,
    handleTestUnraid,
  }
}
