'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { InputField, SectionHeader, TestButton, SECTION_WIDE, type TestResult } from '../SharedComponents'
import type { SettingsFormData } from '../types'
import { testSorraaConnectionAction } from '../../actions'

interface SorraaSectionProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string) => void
}

/** Connexion à sorraa (adresse, clé API, test) : affichée quand sorraa est le gestionnaire choisi */
export function SorraaSection({ formData, updateField }: SorraaSectionProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const handleTest = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await testSorraaConnectionAction(formData.sorraa_url, formData.sorraa_api_key)
      setResult({ success: res.success, message: res.message || (res.success ? 'Connexion réussie' : 'Échec de la connexion') })
    } catch (e) {
      setResult({ success: false, message: (e as Error).message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-6 shadow-xl ${SECTION_WIDE}`}>
      <SectionHeader icon={Download} title="sorraa" description="Automatisation des films et des séries" />
      <div className="grid gap-6 md:grid-cols-2">
        <InputField
          label="URL"
          value={formData.sorraa_url}
          onChange={v => updateField('sorraa_url', v)}
          placeholder="http://localhost:8686"
        />
        <InputField
          label="Clé API"
          value={formData.sorraa_api_key}
          onChange={v => updateField('sorraa_api_key', v)}
          type="password"
          description="Clé créée dans sorraa (réglages, clés API). Le webhook entrant se règle plus bas."
        />
      </div>
      <TestButton onClick={handleTest} loading={loading} result={result} />
    </div>
  )
}
