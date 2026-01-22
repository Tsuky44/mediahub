'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { TabNavigation } from './components/TabNavigation'
import { MediaSettings } from './components/MediaSettings'
import { DownloadSettings } from './components/DownloadSettings'
import { AutomationSettings } from './components/AutomationSettings'
import { StorageSettings } from './components/StorageSettings'
import { MaintenanceSettings } from './components/MaintenanceSettings'
import { SettingsFormData, TabType } from './components/types'

interface Instance {
    id: number
    name: string
    slug: string
    settings: Partial<SettingsFormData>
}

interface SettingsFormProps {
    instances: Instance[]
    currentInstanceId: number
    readOnly?: boolean
}

export default function SettingsForm({ 
    instances,
    currentInstanceId,
    readOnly = false
}: SettingsFormProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<TabType>('media')
    const [selectedInstanceId, setSelectedInstanceId] = useState(currentInstanceId)
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
        unraid_url: '',
        unraid_api_key: '',
        docker_host: '',
        type: 'emby'
    }

    const [formData, setFormData] = useState<SettingsFormData>(initialFormData)

    // Load settings when instance changes
    useEffect(() => {
        const inst = instances.find(i => i.id === selectedInstanceId) || instances[0]
        if (inst && inst.settings) {
            setFormData(prev => ({
                ...initialFormData,
                ...inst.settings
            } as SettingsFormData))
        }
        setStatusMessage(null)
    }, [selectedInstanceId, instances])

    const updateField = (field: keyof SettingsFormData, value: string) => {
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
                body: JSON.stringify({ 
                    instanceId: selectedInstanceId,
                    ...formData
                }),
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Erreur lors de la sauvegarde')

            setStatusMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès !' })
            router.refresh()
        } catch (error: any) {
            setStatusMessage({ type: 'error', text: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Instance Selector */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <select
                        value={selectedInstanceId}
                        onChange={(e) => setSelectedInstanceId(parseInt(e.target.value))}
                        disabled={readOnly || instances.length <= 1}
                        className="rounded-lg border-gray-600 bg-gray-700 py-2 pl-4 pr-10 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {instances.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                                {inst.name}
                            </option>
                        ))}
                    </select>
                    {loading && <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />}
                </div>

                {statusMessage && (
                    <div className={clsx(
                        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
                        statusMessage.type === 'success' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    )}>
                        {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {statusMessage.text}
                    </div>
                )}
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

                <div className="min-h-[400px]">
                    {activeTab === 'media' && (
                        <MediaSettings formData={formData} updateField={updateField} instanceId={selectedInstanceId} />
                    )}
                    {activeTab === 'downloads' && (
                        <DownloadSettings formData={formData} updateField={updateField} />
                    )}
                    {activeTab === 'automation' && (
                        <AutomationSettings formData={formData} updateField={updateField} instanceId={selectedInstanceId} />
                    )}
                    {activeTab === 'storage' && (
                        <StorageSettings formData={formData} updateField={updateField} instanceId={selectedInstanceId} />
                    )}
                    {activeTab === 'maintenance' && (
                        <MaintenanceSettings formData={formData} updateField={updateField} />
                    )}
                </div>

                <div className="sticky bottom-4 flex justify-end rounded-lg border border-gray-700 bg-gray-800/90 p-4 shadow-lg backdrop-blur-sm">
                    <button
                        type="submit"
                        disabled={loading || readOnly}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Sauvegarder les modifications
                    </button>
                </div>
            </form>
        </div>
    )
}
