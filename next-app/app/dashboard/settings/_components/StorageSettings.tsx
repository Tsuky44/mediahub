import { useState } from 'react'
import { HardDrive, Server, Database, Globe } from 'lucide-react'
import { InputField, SectionHeader, TestButton, TestResult } from './SharedComponents'
import { SettingsFormData } from './types'
import { testSmbConnection, testStorageConnection } from '../../downloads/file-actions'
import { testUnraidConnection } from '../../downloads/file-actions'
import { testUnraidDebugAction } from '../actions'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    readOnly?: boolean
}

export const StorageSettings = ({ formData, updateField, readOnly }: Props) => {
    const protocol = formData.storage_protocol || 'smb'
    
    // Storage test states
    const [storageLoading, setStorageLoading] = useState(false)
    const [storageResult, setStorageResult] = useState<TestResult | null>(null)

    // Unraid States
    const [unraidLoading, setUnraidLoading] = useState(false)
    const [unraidResult, setUnraidResult] = useState<TestResult | null>(null)

    const handleTestStorage = async () => {
        setStorageLoading(true)
        setStorageResult(null)
        try {
            const res = await testStorageConnection({
                protocol,
                host: formData.storage_host, 
                port: formData.storage_port,
                share: protocol === 'smb' ? formData.storage_share : '', 
                user: formData.storage_username, 
                pass: formData.storage_password,
                rootPath: formData.storage_root_path,
                secure: protocol === 'ftp' ? formData.storage_secure === 'true' : undefined
            })
            setStorageResult({
                success: res.success,
                message: res.success ? 'Connexion réussie' : (res as any).error || 'Échec de la connexion'
            })
        } catch (e: any) {
            setStorageResult({ success: false, message: e.message })
        } finally {
            setStorageLoading(false)
        }
    }

    const handleTestUnraid = async () => {
        setUnraidLoading(true)
        setUnraidResult(null)
        try {
            const res = await testUnraidConnection(formData.unraid_url, formData.unraid_api_key)
            if (res.success) {
                setUnraidResult({
                    success: true,
                    message: 'Connexion réussie'
                })
            } else {
                const debugRes = await testUnraidDebugAction()
                setUnraidResult({
                    success: debugRes.success,
                    message: debugRes.message || (debugRes.success ? 'Connexion réussie' : 'Échec de la connexion')
                })
            }
        } catch (e: any) {
            setUnraidResult({ success: false, message: e.message })
        } finally {
            setUnraidLoading(false)
        }
    }

    // Migration from legacy SMB settings
    const migrateFromLegacy = () => {
        if (formData.smb_host && !formData.storage_host) {
            updateField('storage_protocol', 'smb')
            updateField('storage_host', formData.smb_host)
            updateField('storage_username', formData.smb_username)
            updateField('storage_password', formData.smb_password)
            updateField('storage_share', formData.smb_share)
        }
    }

    // Auto-migrate on first load if legacy settings exist
    if (formData.smb_host && !formData.storage_host) {
        migrateFromLegacy()
    }

    return (
        <div className="space-y-6">
            {/* Storage Section (SMB/FTP) */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6">
                <SectionHeader 
                    icon={protocol === 'ftp' ? Globe : HardDrive} 
                    title={`Partage ${protocol.toUpperCase()}`} 
                    description="Accès aux fichiers médias" 
                />
                
                {/* Protocol Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Protocole</label>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => updateField('storage_protocol', 'smb')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                protocol === 'smb'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            SMB
                        </button>
                        <button
                            type="button"
                            onClick={() => updateField('storage_protocol', 'ftp')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                protocol === 'ftp'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            FTP
                        </button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <InputField 
                        label="Hôte" 
                        value={formData.storage_host} 
                        onChange={(v) => updateField('storage_host', v)}
                        placeholder={protocol === 'smb' ? "192.168.1.100" : "ftp.example.com"}
                    />
                    <InputField 
                        label="Port (optionnel)" 
                        value={formData.storage_port} 
                        onChange={(v) => updateField('storage_port', v)}
                        placeholder={protocol === 'smb' ? "445" : "21"}
                        description="Laissez vide pour utiliser le port par défaut"
                    />
                    {protocol === 'smb' && (
                        <InputField 
                            label="Partage (Share)" 
                            value={formData.storage_share} 
                            onChange={(v) => updateField('storage_share', v)}
                            placeholder="media"
                        />
                    )}
                    <InputField 
                        label="Utilisateur" 
                        value={formData.storage_username} 
                        onChange={(v) => updateField('storage_username', v)}
                    />
                    <InputField 
                        label="Mot de passe" 
                        value={formData.storage_password} 
                        onChange={(v) => updateField('storage_password', v)}
                        type="password"
                    />
                    <InputField 
                        label={protocol === 'ftp' ? "Dossier de départ" : "Dossier racine (restriction)"} 
                        value={formData.storage_root_path} 
                        onChange={(v) => updateField('storage_root_path', v)}
                        placeholder={protocol === 'ftp' ? "/downloads/qbittorrent" : "/films"}
                        description={protocol === 'ftp' 
                            ? "Chemin où tu arrives quand tu te connectes (ex: /downloads/qbittorrent)" 
                            : "L'utilisateur ne verra que ce dossier et ses sous-dossiers"}
                    />
                </div>
                {/* FTPS Toggle for FTP */}
                {protocol === 'ftp' && (
                    <div className="mt-4 mb-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.storage_secure === 'true'}
                                onChange={(e) => updateField('storage_secure', e.target.checked ? 'true' : 'false')}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-300">
                                Utiliser FTPS (chiffrement TLS)
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                            Active si ton serveur FTP requiert une connexion sécurisée
                        </p>
                    </div>
                )}
                
                <TestButton 
                    onClick={handleTestStorage} 
                    loading={storageLoading} 
                    result={storageResult} 
                />
            </div>

            {/* Legacy SMB (hidden if migrated) */}
            {formData.smb_host && !formData.storage_host && (
                <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 p-6">
                    <p className="text-amber-400 text-sm mb-2">⚠️ Configuration SMB legacy détectée</p>
                    <button
                        onClick={migrateFromLegacy}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                        Migrer vers la nouvelle configuration →
                    </button>
                </div>
            )}

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
