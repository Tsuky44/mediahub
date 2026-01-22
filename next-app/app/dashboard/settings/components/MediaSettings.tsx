import { useState } from 'react'
import { Tv } from 'lucide-react'
import { InputField, SectionHeader, TestButton, TestResult } from './SharedComponents'
import { SettingsFormData } from './types'
import { testEmbyConnection, testPlexConnection, testJellyfinConnection } from '../../downloads/file-actions'
import { importPlexHistoryAction } from '../actions'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    instanceId: number
}

export const MediaSettings = ({ formData, updateField, instanceId }: Props) => {
    // Emby States
    const [embyLoading, setEmbyLoading] = useState(false)
    const [embyResult, setEmbyResult] = useState<TestResult | null>(null)

    // Plex States
    const [plexLoading, setPlexLoading] = useState(false)
    const [plexResult, setPlexResult] = useState<TestResult | null>(null)
    const [importPlexLoading, setImportPlexLoading] = useState(false)
    const [importPlexResult, setImportPlexResult] = useState<TestResult | null>(null)

    // Jellyfin States
    const [jellyfinLoading, setJellyfinLoading] = useState(false)
    const [jellyfinResult, setJellyfinResult] = useState<TestResult | null>(null)

    const handleTestEmby = async () => {
        setEmbyLoading(true)
        setEmbyResult(null)
        try {
            const res = await testEmbyConnection(formData.emby_url, formData.emby_api_key)
            setEmbyResult({
                success: res.success,
                message: res.success ? 'Connexion réussie' : (res as any).error || 'Échec de la connexion'
            })
        } catch (e: any) {
            setEmbyResult({ success: false, message: e.message })
        } finally {
            setEmbyLoading(false)
        }
    }

    const handleTestPlex = async () => {
        setPlexLoading(true)
        setPlexResult(null)
        try {
            const res = await testPlexConnection(formData.plex_url, formData.plex_token)
            setPlexResult({
                success: res.success,
                message: res.success ? 'Connexion réussie' : (res as any).error || 'Échec de la connexion'
            })
        } catch (e: any) {
            setPlexResult({ success: false, message: e.message })
        } finally {
            setPlexLoading(false)
        }
    }

    const handleImportPlex = async () => {
        setImportPlexLoading(true)
        setImportPlexResult(null)
        try {
            const res = await importPlexHistoryAction(instanceId)
            setImportPlexResult({
                success: res.success,
                message: res.success ? 'Import réussi' : (res as any).error || 'Échec de l\'import'
            })
        } catch (e: any) {
            setImportPlexResult({ success: false, message: e.message })
        } finally {
            setImportPlexLoading(false)
        }
    }

    const handleTestJellyfin = async () => {
        setJellyfinLoading(true)
        setJellyfinResult(null)
        try {
            const res = await testJellyfinConnection(formData.jellyfin_url, formData.jellyfin_api_key)
            setJellyfinResult({
                success: res.success,
                message: res.success ? 'Connexion réussie' : (res as any).error || 'Échec de la connexion'
            })
        } catch (e: any) {
            setJellyfinResult({ success: false, message: e.message })
        } finally {
            setJellyfinLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Emby Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Tv} 
                    title="Emby" 
                    description="Configuration du serveur Emby principal" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL du serveur" 
                        value={formData.emby_url} 
                        onChange={(v) => updateField('emby_url', v)}
                        placeholder="http://localhost:8096"
                    />
                    <InputField 
                        label="Clé API" 
                        value={formData.emby_api_key} 
                        onChange={(v) => updateField('emby_api_key', v)}
                        type="password"
                    />
                </div>
                <TestButton 
                    onClick={handleTestEmby} 
                    loading={embyLoading} 
                    result={embyResult} 
                />
            </div>

            {/* Plex Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Tv} 
                    title="Plex" 
                    description="Configuration de l'intégration Plex" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL du serveur" 
                        value={formData.plex_url} 
                        onChange={(v) => updateField('plex_url', v)}
                        placeholder="http://localhost:32400"
                    />
                    <InputField 
                        label="Token (X-Plex-Token)" 
                        value={formData.plex_token} 
                        onChange={(v) => updateField('plex_token', v)}
                        type="password"
                    />
                </div>
                <div className="flex gap-4">
                    <TestButton 
                        onClick={handleTestPlex} 
                        loading={plexLoading} 
                        result={plexResult} 
                    />
                    <TestButton 
                        onClick={handleImportPlex} 
                        loading={importPlexLoading} 
                        result={importPlexResult}
                        label="Importer l'historique" 
                    />
                </div>
            </div>

            {/* Jellyfin Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Tv} 
                    title="Jellyfin" 
                    description="Configuration alternative Jellyfin" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL du serveur" 
                        value={formData.jellyfin_url} 
                        onChange={(v) => updateField('jellyfin_url', v)}
                        placeholder="http://localhost:8096"
                    />
                    <InputField 
                        label="Clé API" 
                        value={formData.jellyfin_api_key} 
                        onChange={(v) => updateField('jellyfin_api_key', v)}
                        type="password"
                    />
                </div>
                <TestButton 
                    onClick={handleTestJellyfin} 
                    loading={jellyfinLoading} 
                    result={jellyfinResult} 
                />
            </div>
        </div>
    )
}
