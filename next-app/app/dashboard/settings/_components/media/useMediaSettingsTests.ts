'use client'

import { useState } from 'react'
import { testEmbyConnection, testPlexConnection, testJellyfinConnection } from '../../../downloads/file-actions'
import { importPlexHistoryAction } from '../../actions'

export interface TestResult {
  success: boolean
  message: string
}

export function useMediaSettingsTests(
  embyUrl: string,
  embyApiKey: string,
  plexUrl: string,
  plexToken: string,
  jellyfinUrl: string,
  jellyfinApiKey: string
) {
  const [embyLoading, setEmbyLoading] = useState(false)
  const [embyResult, setEmbyResult] = useState<TestResult | null>(null)

  const [plexLoading, setPlexLoading] = useState(false)
  const [plexResult, setPlexResult] = useState<TestResult | null>(null)

  const [importPlexLoading, setImportPlexLoading] = useState(false)
  const [importPlexResult, setImportPlexResult] = useState<TestResult | null>(null)

  const [jellyfinLoading, setJellyfinLoading] = useState(false)
  const [jellyfinResult, setJellyfinResult] = useState<TestResult | null>(null)

  const runTest = async <T,>(
    fn: () => Promise<T>,
    setLoading: (v: boolean) => void,
    setResult: (v: TestResult | null) => void,
    successMsg: string,
    errorMsg: string
  ) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fn()
      const typed = res as { success: boolean; error?: string }
      setResult({
        success: typed.success,
        message: typed.success ? successMsg : typed.error || errorMsg,
      })
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : errorMsg
      setResult({ success: false, message })
    } finally {
      setLoading(false)
    }
  }

  const handleTestEmby = () =>
    runTest(
      () => testEmbyConnection(embyUrl, embyApiKey),
      setEmbyLoading,
      setEmbyResult,
      'Connexion réussie',
      'Échec de la connexion'
    )

  const handleTestPlex = () =>
    runTest(
      () => testPlexConnection(plexUrl, plexToken),
      setPlexLoading,
      setPlexResult,
      'Connexion réussie',
      'Échec de la connexion'
    )

  const handleImportPlex = () =>
    runTest(
      () => importPlexHistoryAction(),
      setImportPlexLoading,
      setImportPlexResult,
      'Import réussi',
      "Échec de l'import"
    )

  const handleTestJellyfin = () =>
    runTest(
      () => testJellyfinConnection(jellyfinUrl, jellyfinApiKey),
      setJellyfinLoading,
      setJellyfinResult,
      'Connexion réussie',
      'Échec de la connexion'
    )

  return {
    embyLoading,
    embyResult,
    plexLoading,
    plexResult,
    importPlexLoading,
    importPlexResult,
    jellyfinLoading,
    jellyfinResult,
    handleTestEmby,
    handleTestPlex,
    handleImportPlex,
    handleTestJellyfin,
  }
}
