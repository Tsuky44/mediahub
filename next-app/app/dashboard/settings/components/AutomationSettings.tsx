import { useState } from 'react'
import { Bot, RefreshCw } from 'lucide-react'
import { InputField, SectionHeader, TestButton, TestResult } from './SharedComponents'
import { SettingsFormData } from './types'
import { testJellyseerrConnectionAction, importJellyseerrRequestsAction, fixMissingTitlesAction } from '../actions'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    instanceId: number
}

export const AutomationSettings = ({ formData, updateField, instanceId }: Props) => {
    // Jellyseerr States
    const [jellyseerrLoading, setJellyseerrLoading] = useState(false)
    const [jellyseerrResult, setJellyseerrResult] = useState<TestResult | null>(null)
    const [importRequestsLoading, setImportRequestsLoading] = useState(false)
    const [importRequestsResult, setImportRequestsResult] = useState<TestResult | null>(null)
    const [fixTitlesLoading, setFixTitlesLoading] = useState(false)
    const [fixTitlesResult, setFixTitlesResult] = useState<TestResult | null>(null)

    const handleTestJellyseerr = async () => {
        setJellyseerrLoading(true)
        setJellyseerrResult(null)
        try {
            const res = await testJellyseerrConnectionAction(formData.jellyseerr_url, formData.jellyseerr_api_key)
            setJellyseerrResult(res)
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
            const res = await importJellyseerrRequestsAction(instanceId)
            setImportRequestsResult(res)
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
            const res = await fixMissingTitlesAction(instanceId)
            setFixTitlesResult(res)
        } catch (e: any) {
            setFixTitlesResult({ success: false, message: e.message })
        } finally {
            setFixTitlesLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Jellyseerr Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Bot} 
                    title="Jellyseerr / Overseerr" 
                    description="Gestion des demandes" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL" 
                        value={formData.jellyseerr_url} 
                        onChange={(v) => updateField('jellyseerr_url', v)}
                        placeholder="http://localhost:5055"
                    />
                    <InputField 
                        label="Clé API" 
                        value={formData.jellyseerr_api_key} 
                        onChange={(v) => updateField('jellyseerr_api_key', v)}
                        type="password"
                    />
                </div>
                <div className="flex flex-wrap gap-4">
                    <TestButton 
                        onClick={handleTestJellyseerr} 
                        loading={jellyseerrLoading} 
                        result={jellyseerrResult} 
                    />
                    <TestButton 
                        onClick={handleImportRequests} 
                        loading={importRequestsLoading} 
                        result={importRequestsResult}
                        label="Importer les demandes" 
                    />
                    <TestButton 
                        onClick={handleFixTitles} 
                        loading={fixTitlesLoading} 
                        result={fixTitlesResult}
                        label="Corriger les titres" 
                    />
                </div>
            </div>

            {/* Radarr Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Bot} 
                    title="Radarr" 
                    description="Automatisation des films" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL" 
                        value={formData.radarr_url} 
                        onChange={(v) => updateField('radarr_url', v)}
                        placeholder="http://localhost:7878"
                    />
                    <InputField 
                        label="Clé API" 
                        value={formData.radarr_api_key} 
                        onChange={(v) => updateField('radarr_api_key', v)}
                        type="password"
                    />
                </div>
            </div>

            {/* Sonarr Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Bot} 
                    title="Sonarr" 
                    description="Automatisation des séries" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL" 
                        value={formData.sonarr_url} 
                        onChange={(v) => updateField('sonarr_url', v)}
                        placeholder="http://localhost:8989"
                    />
                    <InputField 
                        label="Clé API" 
                        value={formData.sonarr_api_key} 
                        onChange={(v) => updateField('sonarr_api_key', v)}
                        type="password"
                    />
                </div>
            </div>
        </div>
    )
}
