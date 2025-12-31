'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { testSmbConnection } from '../downloads/file-actions'

interface User {
    id: number
    email: string
    displayName?: string
}

interface SettingsFormProps {
    users: User[]
    currentJellyseerrId: string
    currentQbitUrl?: string
    currentQbitUser?: string
    currentQbitPass?: string
    currentSmbHost?: string
    currentSmbUser?: string
    currentSmbPass?: string
    currentSmbShare?: string
    currentSmbPath?: string
    currentRadarrUrl?: string
    currentRadarrKey?: string
    currentSonarrUrl?: string
    currentSonarrKey?: string
}

export default function SettingsForm({ 
    users, 
    currentJellyseerrId, 
    currentQbitUrl, 
    currentQbitUser, 
    currentQbitPass,
    currentSmbHost,
    currentSmbUser,
    currentSmbPass,
    currentSmbShare,
    currentSmbPath,
    currentRadarrUrl,
    currentRadarrKey,
    currentSonarrUrl,
    currentSonarrKey
}: SettingsFormProps) {
    const [selectedId, setSelectedId] = useState(currentJellyseerrId)
    const [qbitUrl, setQbitUrl] = useState(currentQbitUrl || '')
    const [qbitUser, setQbitUser] = useState(currentQbitUser || '')
    const [qbitPass, setQbitPass] = useState(currentQbitPass || '')
    const [smbHost, setSmbHost] = useState(currentSmbHost || '192.168.1.123')
    const [smbUser, setSmbUser] = useState(currentSmbUser || 'mathis')
    const [smbPass, setSmbPass] = useState(currentSmbPass || '')
    const [smbShare, setSmbShare] = useState(currentSmbShare || 'dl')
    const [smbPath, setSmbPath] = useState(currentSmbPath || '')
    
    const [radarrUrl, setRadarrUrl] = useState(currentRadarrUrl || '')
    const [radarrKey, setRadarrKey] = useState(currentRadarrKey || '')
    const [sonarrUrl, setSonarrUrl] = useState(currentSonarrUrl || '')
    const [sonarrKey, setSonarrKey] = useState(currentSonarrKey || '')

    const [loading, setLoading] = useState(false)
    const [testingSmb, setTestingSmb] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
    const router = useRouter()

    const handleTestSmb = async () => {
        setTestingSmb(true)
        setTestResult(null)
        try {
            const res = await testSmbConnection({
                host: smbHost,
                user: smbUser,
                pass: smbPass,
                share: smbShare
            })
            if (res.success) {
                setTestResult({ success: true, message: 'Connexion réussie !' })
            } else {
                setTestResult({ success: false, message: res.error || 'Échec de la connexion' })
            }
        } catch (error) {
            setTestResult({ success: false, message: 'Erreur lors du test' })
        } finally {
            setTestingSmb(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    jellyseerrUserId: selectedId,
                    qbittorrent_url: qbitUrl,
                    qbittorrent_username: qbitUser,
                    qbittorrent_password: qbitPass,
                    smb_host: smbHost,
                    smb_username: smbUser,
                    smb_password: smbPass,
                    smb_share: smbShare,
                    smb_path: smbPath,
                    radarr_url: radarrUrl,
                    radarr_api_key: radarrKey,
                    sonarr_url: sonarrUrl,
                    sonarr_api_key: sonarrKey
                })
            })

            if (res.ok) {
                alert('Paramètres sauvegardés')
                router.refresh()
            } else {
                alert('Erreur lors de la sauvegarde')
            }
        } catch (error) {
            console.error(error)
            alert('Erreur inattendue')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Jellyseerr</h4>
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-md p-3">
                    <p className="text-sm text-indigo-200">
                        <strong>Détection automatique :</strong> Le système mappe désormais automatiquement votre compte Jellyseerr en utilisant votre email ou nom d'utilisateur Emby.
                    </p>
                </div>
                <div className="opacity-50 pointer-events-none">
                    <label htmlFor="jellyseerrUser" className="block text-sm font-medium text-gray-300">
                        Utilisateur par défaut (Fallback)
                    </label>
                    <select
                        id="jellyseerrUser"
                        name="jellyseerrUser"
                        className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 pl-3 pr-10 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        <option value="">-- Sélectionner un utilisateur --</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.email} {user.displayName ? `(${user.displayName})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">qBittorrent</h4>
                <div>
                    <label htmlFor="qbitUrl" className="block text-sm font-medium text-gray-300">
                        URL
                    </label>
                    <input
                        type="text"
                        id="qbitUrl"
                        className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        placeholder="http://localhost:8080"
                        value={qbitUrl}
                        onChange={(e) => setQbitUrl(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="qbitUser" className="block text-sm font-medium text-gray-300">
                            Nom d'utilisateur
                        </label>
                        <input
                            type="text"
                            id="qbitUser"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="admin"
                            value={qbitUser}
                            onChange={(e) => setQbitUser(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="qbitPass" className="block text-sm font-medium text-gray-300">
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            id="qbitPass"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            value={qbitPass}
                            onChange={(e) => setQbitPass(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">SMB (Partage Windows)</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="smbHost" className="block text-sm font-medium text-gray-300">
                            Hôte (IP)
                        </label>
                        <input
                            type="text"
                            id="smbHost"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="192.168.1.123"
                            value={smbHost}
                            onChange={(e) => setSmbHost(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="smbShare" className="block text-sm font-medium text-gray-300">
                            Nom du partage
                        </label>
                        <input
                            type="text"
                            id="smbShare"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="dl"
                            value={smbShare}
                            onChange={(e) => setSmbShare(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="smbUser" className="block text-sm font-medium text-gray-300">
                            Utilisateur
                        </label>
                        <input
                            type="text"
                            id="smbUser"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="mathis"
                            value={smbUser}
                            onChange={(e) => setSmbUser(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="smbPass" className="block text-sm font-medium text-gray-300">
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            id="smbPass"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            value={smbPass}
                            onChange={(e) => setSmbPass(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="smbPath" className="block text-sm font-medium text-gray-300">
                        Sous-dossier (Optionnel)
                    </label>
                    <input
                        type="text"
                        id="smbPath"
                        className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        placeholder="path/to/folder"
                        value={smbPath}
                        onChange={(e) => setSmbPath(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center space-x-4 pt-2">
                    <button
                        type="button"
                        onClick={handleTestSmb}
                        disabled={testingSmb}
                        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                    >
                        {testingSmb ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Tester la connexion
                    </button>
                    
                    {testResult && (
                        <div className={`flex items-center text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                            {testResult.success ? (
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            ) : (
                                <XCircle className="w-4 h-4 mr-1.5" />
                            )}
                            {testResult.message}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Radarr</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="radarrUrl" className="block text-sm font-medium text-gray-300">
                            URL
                        </label>
                        <input
                            type="text"
                            id="radarrUrl"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="http://192.168.1.x:7878"
                            value={radarrUrl}
                            onChange={(e) => setRadarrUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="radarrKey" className="block text-sm font-medium text-gray-300">
                            Clé API
                        </label>
                        <input
                            type="text"
                            id="radarrKey"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            value={radarrKey}
                            onChange={(e) => setRadarrKey(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Sonarr</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="sonarrUrl" className="block text-sm font-medium text-gray-300">
                            URL
                        </label>
                        <input
                            type="text"
                            id="sonarrUrl"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="http://192.168.1.x:8989"
                            value={sonarrUrl}
                            onChange={(e) => setSonarrUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="sonarrKey" className="block text-sm font-medium text-gray-300">
                            Clé API
                        </label>
                        <input
                            type="text"
                            id="sonarrKey"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            value={sonarrKey}
                            onChange={(e) => setSonarrKey(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sauvegarder
                </button>
            </div>
        </form>
    )
}
