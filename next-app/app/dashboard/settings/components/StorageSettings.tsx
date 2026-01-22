import { useState } from 'react'
import { HardDrive, Server, Database } from 'lucide-react'
import { InputField, SectionHeader, TestButton, TestResult } from './SharedComponents'
import { SettingsFormData } from './types'
import { testSmbConnection, testUnraidConnection } from '../../downloads/file-actions'
import { testUnraidDebugAction } from '../actions'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    instanceId: number
}

export const StorageSettings = ({ formData, updateField, instanceId }: Props) => {
    // SMB States
    const [smbLoading, setSmbLoading] = useState(false)
    const [smbResult, setSmbResult] = useState<TestResult | null>(null)

    // Unraid States
    const [unraidLoading, setUnraidLoading] = useState(false)
    const [unraidResult, setUnraidResult] = useState<TestResult | null>(null)

    const handleTestSmb = async () => {
        setSmbLoading(true)
        setSmbResult(null)
        try {
            const res = await testSmbConnection(
                formData.smb_host, 
                formData.smb_share, 
                formData.smb_username, 
                formData.smb_password
            )
            setSmbResult(res)
        } catch (e: any) {
            setSmbResult({ success: false, message: e.message })
        } finally {
            setSmbLoading(false)
        }
    }

    const handleTestUnraid = async () => {
        setUnraidLoading(true)
        setUnraidResult(null)
        try {
            // Try direct test first
            const res = await testUnraidConnection(formData.unraid_url, formData.unraid_api_key)
            if (res.success) {
                setUnraidResult(res)
            } else {
                // Fallback to debug action if direct test fails (sometimes due to server-side constraints)
                const debugRes = await testUnraidDebugAction(instanceId)
                setUnraidResult(debugRes)
            }
        } catch (e: any) {
            setUnraidResult({ success: false, message: e.message })
        } finally {
            setUnraidLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* SMB Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={HardDrive} 
                    title="Partage SMB" 
                    description="Accès aux fichiers médias" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="Hôte" 
                        value={formData.smb_host} 
                        onChange={(v) => updateField('smb_host', v)}
                        placeholder="192.168.1.100"
                    />
                    <InputField 
                        label="Partage" 
                        value={formData.smb_share} 
                        onChange={(v) => updateField('smb_share', v)}
                        placeholder="media"
                    />
                    <InputField 
                        label="Utilisateur" 
                        value={formData.smb_username} 
                        onChange={(v) => updateField('smb_username', v)}
                    />
                    <InputField 
                        label="Mot de passe" 
                        value={formData.smb_password} 
                        onChange={(v) => updateField('smb_password', v)}
                        type="password"
                    />
                    <InputField 
                        label="Chemin local (optionnel)" 
                        value={formData.smb_path} 
                        onChange={(v) => updateField('smb_path', v)}
                        placeholder="/mnt/user/media"
                        description="Chemin absolu si le serveur tourne sur la même machine"
                    />
                </div>
                <TestButton 
                    onClick={handleTestSmb} 
                    loading={smbLoading} 
                    result={smbResult} 
                />
            </div>

            {/* Unraid Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Server} 
                    title="Unraid" 
                    description="Intégration Unraid API" 
                />
                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="URL" 
                        value={formData.unraid_url} 
                        onChange={(v) => updateField('unraid_url', v)}
                        placeholder="http://192.168.1.100"
                    />
                    <InputField 
                        label="Clé API" 
                        value={formData.unraid_api_key} 
                        onChange={(v) => updateField('unraid_api_key', v)}
                        type="password"
                    />
                </div>
                <TestButton 
                    onClick={handleTestUnraid} 
                    loading={unraidLoading} 
                    result={unraidResult} 
                />
            </div>

            {/* Docker Section */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={Database} 
                    title="Docker" 
                    description="Gestion des conteneurs" 
                />
                <InputField 
                    label="Hôte Docker" 
                    value={formData.docker_host} 
                    onChange={(v) => updateField('docker_host', v)}
                    placeholder="/var/run/docker.sock"
                />
            </div>
        </div>
    )
}
