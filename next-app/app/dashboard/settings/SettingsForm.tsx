'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { testSmbConnection, testJellystatConnection, testEmbyConnection } from '../downloads/file-actions'

interface User {
    id: number
    email: string
    displayName?: string
}

interface Instance {
    id: number
    name: string
    slug: string
    settings: {
        jellyseerr_user_id?: string
        qbittorrent_url?: string
        qbittorrent_username?: string
        qbittorrent_password?: string
        smb_host?: string
        smb_username?: string
        smb_password?: string
        smb_share?: string
        smb_path?: string
        radarr_url?: string
        radarr_api_key?: string
        sonarr_url?: string
        sonarr_api_key?: string
        jellystat_url?: string
        jellystat_api_key?: string
        emby_url?: string
        emby_api_key?: string
        jellyseerr_url?: string
        jellyseerr_api_key?: string
    }
}

interface SettingsFormProps {
    users: User[]
    instances: Instance[]
    currentInstanceId: number
}

export default function SettingsForm({ 
    users, 
    instances,
    currentInstanceId
}: SettingsFormProps) {
    const [selectedInstanceId, setSelectedInstanceId] = useState(currentInstanceId)
    const currentInstance = instances.find(i => i.id === selectedInstanceId) || instances[0]
    const settings = currentInstance.settings

    const [selectedId, setSelectedId] = useState(settings.jellyseerr_user_id || '')
    const [jellyseerrUrl, setJellyseerrUrl] = useState(settings.jellyseerr_url || '')
    const [jellyseerrKey, setJellyseerrKey] = useState(settings.jellyseerr_api_key || '')
    const [qbitUrl, setQbitUrl] = useState(settings.qbittorrent_url || '')
    const [qbitUser, setQbitUser] = useState(settings.qbittorrent_username || '')
    const [qbitPass, setQbitPass] = useState(settings.qbittorrent_password || '')
    const [smbHost, setSmbHost] = useState(settings.smb_host || '')
    const [smbUser, setSmbUser] = useState(settings.smb_username || '')
    const [smbPass, setSmbPass] = useState(settings.smb_password || '')
    const [smbShare, setSmbShare] = useState(settings.smb_share || '')
    const [smbPath, setSmbPath] = useState(settings.smb_path || '')
    
    const [radarrUrl, setRadarrUrl] = useState(settings.radarr_url || '')
    const [radarrKey, setRadarrKey] = useState(settings.radarr_api_key || '')
    const [sonarrUrl, setSonarrUrl] = useState(settings.sonarr_url || '')
    const [sonarrKey, setSonarrKey] = useState(settings.sonarr_api_key || '')

    const [jellystatUrl, setJellystatUrl] = useState(settings.jellystat_url || '')
    const [jellystatKey, setJellystatKey] = useState(settings.jellystat_api_key || '')

    const [embyUrl, setEmbyUrl] = useState(settings.emby_url || '')
    const [embyKey, setEmbyKey] = useState(settings.emby_api_key || '')

    const [loading, setLoading] = useState(false)
    const [testingSmb, setTestingSmb] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    // Update form when instance changes
    useEffect(() => {
        const inst = instances.find(i => i.id === selectedInstanceId) || instances[0]
        const s = inst.settings
        setSelectedId(s.jellyseerr_user_id || '')
        setJellyseerrUrl(s.jellyseerr_url || '')
        setJellyseerrKey(s.jellyseerr_api_key || '')
        setQbitUrl(s.qbittorrent_url || '')
        setQbitUser(s.qbittorrent_username || '')
        setQbitPass(s.qbittorrent_password || '')
        setSmbHost(s.smb_host || '')
        setSmbUser(s.smb_username || '')
        setSmbPass(s.smb_password || '')
        setSmbShare(s.smb_share || '')
        setSmbPath(s.smb_path || '')
        setRadarrUrl(s.radarr_url || '')
        setRadarrKey(s.radarr_api_key || '')
        setSonarrUrl(s.sonarr_url || '')
        setSonarrKey(s.sonarr_api_key || '')
        setJellystatUrl(s.jellystat_url || '')
        setJellystatKey(s.jellystat_api_key || '')
        setEmbyUrl(s.emby_url || '')
        setEmbyKey(s.emby_api_key || '')
        setEmbyTestResult(null)
        setJellystatTestResult(null)
        setTestResult(null)
    }, [selectedInstanceId, instances])
    
    const [testingJellystat, setTestingJellystat] = useState(false)
    const [jellystatTestResult, setJellystatTestResult] = useState<{ success: boolean; message: string } | null>(null)
    
    const [testingEmby, setTestingEmby] = useState(false)
    const [embyTestResult, setEmbyTestResult] = useState<{ success: boolean; message: string } | null>(null)

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

    const handleTestJellystat = async () => {
        setTestingJellystat(true)
        setJellystatTestResult(null)
        try {
            const res = await testJellystatConnection(jellystatUrl, jellystatKey)
            if (res.success) {
                setJellystatTestResult({ success: true, message: 'Connexion réussie !' })
            } else {
                setJellystatTestResult({ success: false, message: res.error || 'Échec de la connexion' })
            }
        } catch (error) {
            setJellystatTestResult({ success: false, message: 'Erreur lors du test' })
        } finally {
            setTestingJellystat(false)
        }
    }

    const handleTestEmby = async () => {
        setTestingEmby(true)
        setEmbyTestResult(null)
        try {
            const res = await testEmbyConnection(embyUrl, embyKey)
            if (res.success) {
                setEmbyTestResult({ success: true, message: 'Connexion Emby réussie !' })
            } else {
                setEmbyTestResult({ success: false, message: res.error || 'Échec de la connexion' })
            }
        } catch (error) {
            setEmbyTestResult({ success: false, message: 'Erreur lors du test' })
        } finally {
            setTestingEmby(false)
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
                    instanceId: selectedInstanceId,
                    jellyseerrUserId: selectedId,
                    jellyseerr_url: jellyseerrUrl,
                    jellyseerr_api_key: jellyseerrKey,
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
                    sonarr_api_key: sonarrKey,
                    jellystat_url: jellystatUrl,
            jellystat_api_key: jellystatKey,
            emby_url: embyUrl,
            emby_api_key: embyKey
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
            {instances.length > 1 && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-8">
                    <label htmlFor="instance-selector" className="block text-sm font-medium text-gray-400 mb-2">
                        Instance à configurer
                    </label>
                    <select
                        id="instance-selector"
                        className="block w-full rounded-md border-gray-600 bg-gray-700 py-2 pl-3 pr-10 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        value={selectedInstanceId}
                        onChange={(e) => setSelectedInstanceId(parseInt(e.target.value))}
                    >
                        {instances.map((inst) => (
                            <option key={inst.id} value={inst.id}>
                                {inst.name} {inst.id === currentInstanceId ? '(Actuelle)' : ''}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Jellyseerr</h4>
                <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-md p-3">
                    <p className="text-sm text-indigo-200">
                        <strong>Détection automatique :</strong> Le système mappe désormais automatiquement votre compte Jellyseerr en utilisant votre email ou nom d'utilisateur Emby.
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="jellyseerrUrl" className="block text-sm font-medium text-gray-300">
                            URL Jellyseerr
                        </label>
                        <input
                            type="text"
                            id="jellyseerrUrl"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="https://jellyseerr.example.com"
                            value={jellyseerrUrl}
                            onChange={(e) => setJellyseerrUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="jellyseerrKey" className="block text-sm font-medium text-gray-300">
                            Clé API Jellyseerr
                        </label>
                        <input
                            type="password"
                            id="jellyseerrKey"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="Votre clé API"
                            value={jellyseerrKey}
                            onChange={(e) => setJellyseerrKey(e.target.value)}
                        />
                    </div>
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
                <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                    <h4 className="text-lg font-medium text-white">SMB (Partage Windows)</h4>
                    <span className="text-xs text-gray-400 italic">Optionnel</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="smbHost" className="block text-sm font-medium text-gray-300">
                            Hôte (IP)
                        </label>
                        <input
                            type="text"
                            id="smbHost"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="ex: 192.168.1.50"
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
                            placeholder="ex: partages"
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
                            placeholder="Identifiant"
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

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Jellystat</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="jellystatUrl" className="block text-sm font-medium text-gray-300">
                            URL de l'instance
                        </label>
                        <input
                            type="text"
                            id="jellystatUrl"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="http://192.168.1.123:3076"
                            value={jellystatUrl}
                            onChange={(e) => setJellystatUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="jellystatKey" className="block text-sm font-medium text-gray-300">
                            Clé API
                        </label>
                        <input
                            type="password"
                            id="jellystatKey"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="Votre clé API Jellystat"
                            value={jellystatKey}
                            onChange={(e) => setJellystatKey(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4 pt-2">
                    <button
                        type="button"
                        onClick={handleTestJellystat}
                        disabled={testingJellystat}
                        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                    >
                        {testingJellystat ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Tester la connexion
                    </button>
                    
                    {jellystatTestResult && (
                        <div className={`flex items-center text-sm ${jellystatTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                            {jellystatTestResult.success ? (
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            ) : (
                                <XCircle className="w-4 h-4 mr-1.5" />
                            )}
                            {jellystatTestResult.message}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Emby</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="embyUrl" className="block text-sm font-medium text-gray-300">
                            URL Emby
                        </label>
                        <input
                            type="text"
                            id="embyUrl"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="http://192.168.1.100:8096"
                            value={embyUrl}
                            onChange={(e) => setEmbyUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="embyKey" className="block text-sm font-medium text-gray-300">
                            Clé API Emby
                        </label>
                        <input
                            type="password"
                            id="embyKey"
                            className="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="Votre clé API Emby"
                            value={embyKey}
                            onChange={(e) => setEmbyKey(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-4 pt-2">
                    <button
                        type="button"
                        onClick={handleTestEmby}
                        disabled={testingEmby}
                        className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                    >
                        {testingEmby ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                        )}
                        Tester la connexion
                    </button>
                    
                    {embyTestResult && (
                        <div className={`flex items-center text-sm ${embyTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                            {embyTestResult.success ? (
                                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            ) : (
                                <XCircle className="w-4 h-4 mr-1.5" />
                            )}
                            {embyTestResult.message}
                        </div>
                    )}
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
