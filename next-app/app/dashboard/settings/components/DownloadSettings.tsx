import { useState } from 'react'
import { Download, Globe } from 'lucide-react'
import { InputField, SectionHeader, TestButton, TestResult } from './SharedComponents'
import { SettingsFormData } from './types'
import { testProwlarrConnectionAction } from '../actions'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
}

export const DownloadSettings = ({ formData, updateField }: Props) => {
    // Prowlarr States
    const [prowlarrLoading, setProwlarrLoading] = useState(false)
    const [prowlarrResult, setProwlarrResult] = useState<TestResult | null>(null)

    const handleTestProwlarr = async () => {
        setProwlarrLoading(true)
        setProwlarrResult(null)
        try {
            const res = await testProwlarrConnectionAction(formData.prowlarr_url, formData.prowlarr_api_key)
            setProwlarrResult({
                success: res.success,
                message: res.message || (res.success ? 'Connexion réussie' : 'Échec de la connexion')
            })
        } catch (e: any) {
            setProwlarrResult({ success: false, message: e.message })
        } finally {
            setProwlarrLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* QBittorrent Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Download} 
                    title="QBittorrent" 
                    description="Client de téléchargement principal" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL" 
                        value={formData.qbittorrent_url} 
                        onChange={(v) => updateField('qbittorrent_url', v)}
                        placeholder="http://localhost:8080"
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField 
                            label="Identifiant" 
                            value={formData.qbittorrent_username} 
                            onChange={(v) => updateField('qbittorrent_username', v)}
                        />
                        <InputField 
                            label="Mot de passe" 
                            value={formData.qbittorrent_password} 
                            onChange={(v) => updateField('qbittorrent_password', v)}
                            type="password"
                        />
                    </div>
                </div>
            </div>

            {/* Prowlarr Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Globe} 
                    title="Prowlarr" 
                    description="Gestionnaire d'indexeurs" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL" 
                        value={formData.prowlarr_url} 
                        onChange={(v) => updateField('prowlarr_url', v)}
                        placeholder="http://localhost:9696"
                    />
                    <InputField 
                        label="Clé API" 
                        value={formData.prowlarr_api_key} 
                        onChange={(v) => updateField('prowlarr_api_key', v)}
                        type="password"
                    />
                </div>
                <TestButton 
                    onClick={handleTestProwlarr} 
                    loading={prowlarrLoading} 
                    result={prowlarrResult} 
                />
            </div>
        </div>
    )
}
