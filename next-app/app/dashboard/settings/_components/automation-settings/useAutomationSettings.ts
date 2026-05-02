'use client'

import { useState } from 'react'
import { testJellyseerrConnectionAction, importJellyseerrRequestsAction, fixMissingTitlesAction } from '../../actions'
import type { TestResult } from '../SharedComponents'

export function useAutomationSettings() {
  const [jellyseerrLoading, setJellyseerrLoading] = useState(false)
  const [jellyseerrResult, setJellyseerrResult] = useState<TestResult | null>(null)
  const [importRequestsLoading, setImportRequestsLoading] = useState(false)
  const [importRequestsResult, setImportRequestsResult] = useState<TestResult | null>(null)
  const [fixTitlesLoading, setFixTitlesLoading] = useState(false)
  const [fixTitlesResult, setFixTitlesResult] = useState<TestResult | null>(null)

  const handleTestJellyseerr = async (url: string, apiKey: string) => {
    setJellyseerrLoading(true)
    setJellyseerrResult(null)
    try {
      const res = await testJellyseerrConnectionAction(url, apiKey)
      setJellyseerrResult({
        success: res.success,
        message: res.message || (res.success ? 'Connexion réussie' : 'Échec de la connexion'),
      })
    } catch (e: any) {
      setJellyseerrResult({ success: false, message: e.message })
    } finally {
      setJellyseerrLoading(false)
    }
  }

  const handleImportRequests = async () => {
    if (!confirm('Attention : Ceci supprimera toutes les demandes existantes pour les réimporter. Continuer ?')) return
    setImportRequestsLoading(true)
    setImportRequestsResult(null)
    try {
      const res = await importJellyseerrRequestsAction()
      setImportRequestsResult({
        success: res.success,
        message: res.message || (res.success ? 'Import réussi' : "Échec de l'import"),
      })
    } catch (e: any) {
      setImportRequestsResult({ success: false, message: e.message })
    } finally {
      setImportRequestsLoading(false)
    }
  }

  const handleFixTitles = async () => {
    setFixTitlesLoading(true)
    setFixTitlesResult(null)
    try {
      const res = await fixMissingTitlesAction()
      setFixTitlesResult({
        success: res.success,
        message: res.message || (res.success ? 'Correction terminée' : 'Échec de la correction'),
      })
    } catch (e: any) {
      setFixTitlesResult({ success: false, message: e.message })
    } finally {
      setFixTitlesLoading(false)
    }
  }

  return {
    jellyseerrLoading,
    jellyseerrResult,
    importRequestsLoading,
    importRequestsResult,
    fixTitlesLoading,
    fixTitlesResult,
    handleTestJellyseerr,
    handleImportRequests,
    handleFixTitles,
  }
}
