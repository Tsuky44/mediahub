import { useState } from 'react'
import { Download, Globe } from 'lucide-react'
import { InputField, SectionHeader, TestButton, TestResult } from './SharedComponents'
import { SettingsFormData } from './types'
import { testProwlarrConnectionAction, testQBittorrentConnectionAction } from '../actions'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    readOnly?: boolean
}

export const DownloadSettings = ({ formData, updateField, readOnly }: Props) => {
    // QBittorrent States
    const [qbitLoading, setQbitLoading] = useState(false)
    const [qbitResult, setQbitResult] = useState<TestResult | null>(null)

    // Prowlarr States
    const [prowlarrLoading, setProwlarrLoading] = useState(false)
    const [prowlarrResult, setProwlarrResult] = useState<TestResult | null>(null)

    const handleTestQBittorrent = async () => {
        setQbitLoading(true)
        setQbitResult(null)
        try {
            const res = await testQBittorrentConnectionAction(
                formData.qbittorrent_url, 
                formData.qbittorrent_username, 
                formData.qbittorrent_password
            )
            setQbitResult({
                success: res.success,
                message: res.message || (res.success ? 'Connexion réussie' : 'Échec de la connexion')
            })
        } catch (e: any) {
            setQbitResult({ success: false, message: e.message })
        } finally {
            setQbitLoading(false)
        }
    }

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
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
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
                    <div className="grid grid-cols-2 gap-4">
                        <InputField 
                            label="Intervalle de rafraîchissement (sec)" 
                            value={formData.qbittorrent_poll_interval} 
                            onChange={(v) => updateField('qbittorrent_poll_interval', v)}
                            type="number"
                            placeholder="5"
                        />
                    </div>
                </div>
                <TestButton 
                    onClick={handleTestQBittorrent} 
                    loading={qbitLoading} 
                    result={qbitResult} 
                />
            </div>

            {/* Prowlarr Section */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
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
