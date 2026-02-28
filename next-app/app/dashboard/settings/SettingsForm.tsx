'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Save, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { TabNavigation } from './components/TabNavigation'
import { MediaSettings } from './components/MediaSettings'
import { DownloadSettings } from './components/DownloadSettings'
import { AutomationSettings } from './components/AutomationSettings'
import { StorageSettings } from './components/StorageSettings'
import { MaintenanceSettings } from './components/MaintenanceSettings'
import { SettingsFormData, TabType } from './components/types'

interface SettingsFormProps {
    settings: Partial<SettingsFormData>
    readOnly?: boolean
}

export default function SettingsForm({ 
    settings,
    readOnly = false
}: SettingsFormProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const subtab = searchParams.get('subtab')

    const [activeTab, setActiveTab] = useState<TabType>(() => {
        if (subtab && ['media', 'downloads', 'automation', 'storage', 'maintenance'].includes(subtab)) {
            return subtab as TabType
        }
        return 'media'
    })

    // Update tab if URL param changes
    useEffect(() => {
        if (subtab && ['media', 'downloads', 'automation', 'storage', 'maintenance'].includes(subtab)) {
            setActiveTab(subtab as TabType)
        }
    }, [subtab])

    const [loading, setLoading] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Initial Form State
    const initialFormData: SettingsFormData = {
        qbittorrent_url: '',
        qbittorrent_username: '',
        qbittorrent_password: '',
        prowlarr_url: '',
        prowlarr_api_key: '',
        smb_host: '',
        smb_username: '',
        smb_password: '',
        smb_share: '',
        smb_path: '',
        radarr_url: '',
        radarr_api_key: '',
        sonarr_url: '',
        sonarr_api_key: '',
        jellyseerr_url: '',
        jellyseerr_api_key: '',
        emby_url: '',
        emby_api_key: '',
        plex_url: '',
        plex_token: '',
        jellyfin_url: '',
        jellyfin_api_key: '',
        auth_emby_enabled: true,
        auth_plex_enabled: false,
        auth_jellyfin_enabled: false,
        unraid_url: '',
        unraid_api_key: '',
        docker_host: '',
    }

    const [formData, setFormData] = useState<SettingsFormData>(initialFormData)

    // Load settings
    useEffect(() => {
        if (settings) {
            setFormData(prev => ({
                ...initialFormData,
                ...settings
            } as SettingsFormData))
        }
        setStatusMessage(null)
    }, [settings])

    const updateField = (field: keyof SettingsFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setStatusMessage(null)

        try {
            const res = await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setStatusMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès' })
                router.refresh()
            } else {
                const data = await res.json()
                setStatusMessage({ type: 'error', text: data.error || 'Une erreur est survenue' })
            }
        } catch (error) {
            setStatusMessage({ type: 'error', text: 'Impossible de contacter le serveur' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="space-y-6 min-h-[400px]">
                {activeTab === 'media' && (
                    <MediaSettings 
                        formData={formData} 
                        updateField={updateField} 
                        readOnly={readOnly}
                    />
                )}
                {activeTab === 'downloads' && (
                    <DownloadSettings 
                        formData={formData} 
                        updateField={updateField} 
                        readOnly={readOnly}
                    />
                )}
                {activeTab === 'automation' && (
                    <AutomationSettings 
                        formData={formData} 
                        updateField={updateField} 
                        readOnly={readOnly}
                    />
                )}
                {activeTab === 'storage' && (
                    <StorageSettings 
                        formData={formData} 
                        updateField={updateField} 
                        readOnly={readOnly}
                    />
                )}
                {activeTab === 'maintenance' && (
                    <MaintenanceSettings 
                        formData={formData} 
                        updateField={updateField} 
                        readOnly={readOnly}
                    />
                )}
            </div>

            {!readOnly && (
                <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
                    {statusMessage && (
                        <div className={clsx(
                            "flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-right-4",
                            statusMessage.type === 'success' ? "text-green-400" : "text-red-400"
                        )}>
                            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {statusMessage.text}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className={clsx(
                            "flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-900/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                            loading && "animate-pulse"
                        )}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        <span>Enregistrer</span>
                    </button>
                </div>
            )}
        </form>
    )
}
