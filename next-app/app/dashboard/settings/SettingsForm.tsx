'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, CheckCircle2, XCircle, RefreshCw, History, Trash2, ListPlus } from 'lucide-react'
import { testSmbConnection, testEmbyConnection, testPlexConnection, testJellyfinConnection, testUnraidConnection } from '../downloads/file-actions'
import { importPlexHistoryAction, testJellyseerrConnectionAction, importJellyseerrRequestsAction, fixMissingTitlesAction, testUnraidDebugAction } from './actions'

interface Instance {
    id: number
    name: string
    slug: string
    settings: {
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
        jellyseerr_url?: string
        jellyseerr_api_key?: string
        emby_url?: string
        emby_api_key?: string
        plex_url?: string
        plex_token?: string
        jellyfin_url?: string
        jellyfin_api_key?: string
        unraid_url?: string
        unraid_api_key?: string
        docker_host?: string
        type?: string
    }
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
    const [selectedInstanceId, setSelectedInstanceId] = useState(currentInstanceId)
    const currentInstance = instances.find(i => i.id === selectedInstanceId) || instances[0]
    const settings = currentInstance.settings

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

    const [jellyseerrUrl, setJellyseerrUrl] = useState(settings.jellyseerr_url || '')
    const [jellyseerrKey, setJellyseerrKey] = useState(settings.jellyseerr_api_key || '')

    const [embyUrl, setEmbyUrl] = useState(settings.emby_url || '')
    const [embyKey, setEmbyKey] = useState(settings.emby_api_key || '')

    const [plexUrl, setPlexUrl] = useState(settings.plex_url || '')
    const [plexToken, setPlexToken] = useState(settings.plex_token || '')

    const [jellyfinUrl, setJellyfinUrl] = useState(settings.jellyfin_url || '')
    const [jellyfinKey, setJellyfinKey] = useState(settings.jellyfin_api_key || '')

    const [unraidUrl, setUnraidUrl] = useState(settings.unraid_url || '')
    const [unraidKey, setUnraidKey] = useState(settings.unraid_api_key || '')
    const [dockerHost, setDockerHost] = useState(settings.docker_host || '')

    const [instanceType, setInstanceType] = useState(settings.type || 'emby')

    const [loading, setLoading] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [testingSmb, setTestingSmb] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

    // Update form when instance changes
    useEffect(() => {
        const inst = instances.find(i => i.id === selectedInstanceId) || instances[0]
        const s = inst.settings
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
        setJellyseerrUrl(s.jellyseerr_url || '')
        setJellyseerrKey(s.jellyseerr_api_key || '')
        setEmbyUrl(s.emby_url || '')
        setEmbyKey(s.emby_api_key || '')
        setPlexUrl(s.plex_url || '')
        setPlexToken(s.plex_token || '')
        setJellyfinUrl(s.jellyfin_url || '')
        setJellyfinKey(s.jellyfin_api_key || '')
        setUnraidUrl(s.unraid_url || '')
        setUnraidKey(s.unraid_api_key || '')
        setDockerHost(s.docker_host || '')
        setInstanceType(s.type || 'emby')
        setEmbyTestResult(null)
        setPlexTestResult(null)
        setJellyfinTestResult(null)
        setUnraidTestResult(null)
        setTestResult(null)
    }, [selectedInstanceId, instances])
    
    const [testingEmby, setTestingEmby] = useState(false)
    const [embyTestResult, setEmbyTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const [testingPlex, setTestingPlex] = useState(false)
    const [plexTestResult, setPlexTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const [testingJellyfin, setTestingJellyfin] = useState(false)
    const [jellyfinTestResult, setJellyfinTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const [testingUnraid, setTestingUnraid] = useState(false)
    const [unraidTestResult, setUnraidTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const handleTestUnraidDebug = async () => {
        setTestingUnraid(true)
        setUnraidTestResult(null)
        try {
            const res = await testUnraidDebugAction(selectedInstanceId)
            setUnraidTestResult(res)
        } catch {
            setUnraidTestResult({ success: false, message: 'Erreur lors du test debug' })
        } finally {
            setTestingUnraid(false)
        }
    }

    const [importingPlex, setImportingPlex] = useState(false)
    const [importPlexResult, setImportPlexResult] = useState<{ success: boolean; message: string } | null>(null)

    const router = useRouter()

    const handleImportPlex = async () => {
        if (!confirm('Voulez-vous vraiment importer tout l\'historique Plex ? Cela peut prendre du temps.')) return
        
        setImportingPlex(true)
        setImportPlexResult(null)
        try {
            const res = await importPlexHistoryAction(selectedInstanceId)
            setImportPlexResult(res)
            if (res.success) {
                router.refresh()
            }
        } catch {
            setImportPlexResult({ success: false, message: 'Erreur lors de l\'importation' })
        } finally {
            setImportingPlex(false)
        }
    }

    const [testingJellyseerr, setTestingJellyseerr] = useState(false)
    const [jellyseerrTestResult, setJellyseerrTestResult] = useState<{ success: boolean; message: string } | null>(null)

    const [importingJellyseerr, setImportingJellyseerr] = useState(false)
    const [importJellyseerrResult, setImportJellyseerrResult] = useState<{ success: boolean; message: string } | null>(null)

    const [fixingTitles, setFixingTitles] = useState(false)
    const [fixTitlesResult, setFixTitlesResult] = useState<{ success: boolean; message: string } | null>(null)

    const handleTestJellyseerr = async () => {
        setTestingJellyseerr(true)
        setJellyseerrTestResult(null)
        try {
            const res = await testJellyseerrConnectionAction(jellyseerrUrl, jellyseerrKey)
            setJellyseerrTestResult(res)
        } catch {
            setJellyseerrTestResult({ success: false, message: 'Erreur lors du test' })
        } finally {
            setTestingJellyseerr(false)
        }
    }

    const handleImportJellyseerr = async () => {
        if (!confirm('Voulez-vous vraiment importer les demandes Jellyseerr ?')) return
        
        setImportingJellyseerr(true)
        setImportJellyseerrResult(null)
        try {
            const res = await importJellyseerrRequestsAction(selectedInstanceId)
            setImportJellyseerrResult(res)
            if (res.success) {
                router.refresh()
            }
        } catch {
      setImportJellyseerrResult({ success: false, message: 'Erreur lors de l\'importation' })
    } finally {
      setImportingJellyseerr(false)
    }
    }

    const handleFixMissingTitles = async () => {
        setFixingTitles(true)
        setFixTitlesResult(null)
        try {
            const res = await fixMissingTitlesAction(selectedInstanceId)
            setFixTitlesResult(res)
            if (res.success) {
                router.refresh()
            }
        } catch {
            setFixTitlesResult({ success: false, message: 'Erreur lors de la correction' })
        } finally {
            setFixingTitles(false)
        }
    }

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
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || 'Erreur lors du test' })
        } finally {
            setTestingSmb(false)
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
        } catch {
            setEmbyTestResult({ success: false, message: 'Erreur lors du test' })
        } finally {
            setTestingEmby(false)
        }
    }

    const handleTestPlex = async () => {
        setTestingPlex(true)
        setPlexTestResult(null)
        try {
            const res = await testPlexConnection(plexUrl, plexToken)
            if (res.success) {
                setPlexTestResult({ success: true, message: 'Connexion Plex réussie !' })
            } else {
                setPlexTestResult({ success: false, message: res.error || 'Échec de la connexion' })
            }
        } catch {
      setPlexTestResult({ success: false, message: 'Erreur lors du test' })
    } finally {
      setTestingPlex(false)
    }
    }

    const handleTestJellyfin = async () => {
        setTestingJellyfin(true)
        setJellyfinTestResult(null)
        try {
            const res = await testJellyfinConnection(jellyfinUrl, jellyfinKey)
            if (res.success) {
                setJellyfinTestResult({ success: true, message: 'Connexion Jellyfin réussie !' })
            } else {
                setJellyfinTestResult({ success: false, message: res.error || 'Échec de la connexion' })
            }
        } catch {
            setJellyfinTestResult({ success: false, message: 'Erreur lors du test' })
        } finally {
            setTestingJellyfin(false)
        }
    }

    const handleTestUnraid = async () => {
        setTestingUnraid(true)
        setUnraidTestResult(null)
        try {
            const res = await testUnraidConnection(unraidUrl, unraidKey)
            if (res.success) {
                setUnraidTestResult({ success: true, message: 'Connexion Unraid réussie !' })
            } else {
                setUnraidTestResult({ success: false, message: res.error || 'Échec de la connexion' })
            }
        } catch {
      setUnraidTestResult({ success: false, message: 'Erreur lors du test' })
    } finally {
      setTestingUnraid(false)
    }
    }

    const handleResetInstance = async () => {
        if (!confirm('Êtes-vous sûr de vouloir réinitialiser cette instance ? TOUTES les données (historique, utilisateurs, requêtes, etc.) seront supprimées définitivement. Cette action est irréversible.')) {
            return
        }

        setResetLoading(true)
        try {
            const res = await fetch(`/api/user/instances/${selectedInstanceId}/reset`, {
                method: 'POST',
            })

            if (res.ok) {
                alert('Instance réinitialisée avec succès')
                router.refresh()
            } else {
                const errorData = await res.json().catch(() => ({}))
                alert(`Erreur lors de la réinitialisation: ${errorData.error || 'Erreur inconnue'}`)
            }
        } catch (error) {
            console.error(error)
            alert('Erreur lors de la réinitialisation')
        } finally {
            setResetLoading(false)
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
                    jellyseerr_url: jellyseerrUrl,
                    jellyseerr_api_key: jellyseerrKey,
                    emby_url: embyUrl,
                    emby_api_key: embyKey,
                    plex_url: plexUrl,
                    plex_token: plexToken,
                    jellyfin_url: jellyfinUrl,
                    jellyfin_api_key: jellyfinKey,
                    unraid_url: unraidUrl,
                    unraid_api_key: unraidKey,
                    docker_host: dockerHost,
                    type: instanceType
                })
            })

            if (res.ok) {
                alert('Paramètres sauvegardés')
                router.refresh()
            } else {
                const errorData = await res.json().catch(() => ({}))
                alert(`Erreur lors de la sauvegarde: ${errorData.error || 'Erreur inconnue'}`)
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
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-8">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
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
                        <div>
                            <label htmlFor="instance-type" className="block text-sm font-medium text-gray-400 mb-2">
                                Type de serveur principal
                            </label>
                            <select
                                id="instance-type"
                                disabled={readOnly}
                                className="block w-full rounded-md border-gray-600 bg-gray-700 py-2 pl-3 pr-10 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm disabled:opacity-50"
                                value={instanceType}
                                onChange={(e) => setInstanceType(e.target.value)}
                            >
                                <option value="emby">Emby</option>
                                <option value="jellyfin">Jellyfin</option>
                                <option value="plex">Plex</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <h5 className="text-sm font-medium text-red-400">Zone de danger</h5>
                                <p className="text-xs text-gray-500 mt-1">
                                    Réinitialiser l&apos;instance supprimera toutes les données mais conservera l&apos;URL Emby.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleResetInstance}
                                disabled={resetLoading || readOnly}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                            >
                                {resetLoading ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Réinitialiser l&apos;instance
                            </button>
                        </div>
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
                        disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        placeholder="http://localhost:8080"
                        value={qbitUrl}
                        onChange={(e) => setQbitUrl(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="qbitUser" className="block text-sm font-medium text-gray-300">
                            Nom d&apos;utilisateur
                        </label>
                        <input
                            type="text"
                            id="qbitUser"
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            value={qbitPass}
                            onChange={(e) => setQbitPass(e.target.value)}
                        />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button
                            type="button"
                            onClick={handleTestUnraidDebug}
                            disabled={testingUnraid}
                            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {testingUnraid ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Tester la connexion Unraid
                        </button>
                        
                        {unraidTestResult && (
                            <div className={`flex items-center text-sm ${unraidTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {unraidTestResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                )}
                                {unraidTestResult.message}
                            </div>
                        )}
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                        disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            value={sonarrKey}
                            onChange={(e) => setSonarrKey(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-8">
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
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="Votre clé API Emby"
                                value={embyKey}
                                onChange={(e) => setEmbyKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="dockerHost" className="block text-sm font-medium text-gray-300">
                            Docker Host (Optionnel - pour les logs)
                        </label>
                        <input
                            type="text"
                            id="dockerHost"
                            disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            placeholder="ex: tcp://192.168.1.100:2375 ou /var/run/docker.sock"
                            value={dockerHost}
                            onChange={(e) => setDockerHost(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Laissez vide pour utiliser le socket local par défaut. Utilisez tcp:// pour un accès distant.
                        </p>
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
                            Tester la connexion Emby
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

                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Plex</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="plexUrl" className="block text-sm font-medium text-gray-300">
                                URL Plex
                            </label>
                            <input
                                type="text"
                                id="plexUrl"
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="http://192.168.1.100:32400"
                                value={plexUrl}
                                onChange={(e) => setPlexUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="plexToken" className="block text-sm font-medium text-gray-300">
                                Token Plex
                            </label>
                            <input
                                type="password"
                                id="plexToken"
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="Votre Token Plex"
                                value={plexToken}
                                onChange={(e) => setPlexToken(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button
                            type="button"
                            onClick={handleTestPlex}
                            disabled={testingPlex}
                            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {testingPlex ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Tester la connexion Plex
                        </button>

                        <button
                            type="button"
                            onClick={handleImportPlex}
                            disabled={importingPlex || testingPlex || readOnly}
                            className="flex items-center px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {importingPlex ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <History className="w-4 h-4 mr-2" />
                            )}
                            Importer l&apos;historique complet
                        </button>
                        
                        {plexTestResult && (
                            <div className={`flex items-center text-sm ${plexTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {plexTestResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                )}
                                {plexTestResult.message}
                            </div>
                        )}

                        {importPlexResult && (
                            <div className={`flex items-center text-sm ${importPlexResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {importPlexResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                )}
                                {importPlexResult.message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Jellyfin</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="jellyfinUrl" className="block text-sm font-medium text-gray-300">
                                URL Jellyfin
                            </label>
                            <input
                                type="text"
                                id="jellyfinUrl"
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="http://192.168.1.100:8096"
                                value={jellyfinUrl}
                                onChange={(e) => setJellyfinUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="jellyfinKey" className="block text-sm font-medium text-gray-300">
                                Clé API Jellyfin
                            </label>
                            <input
                                type="password"
                                id="jellyfinKey"
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="Votre clé API Jellyfin"
                                value={jellyfinKey}
                                onChange={(e) => setJellyfinKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button
                            type="button"
                            onClick={handleTestJellyfin}
                            disabled={testingJellyfin}
                            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {testingJellyfin ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Tester la connexion Jellyfin
                        </button>
                        
                        {jellyfinTestResult && (
                            <div className={`flex items-center text-sm ${jellyfinTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {jellyfinTestResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                )}
                                {jellyfinTestResult.message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white border-b border-gray-700 pb-2">Unraid</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="unraidUrl" className="block text-sm font-medium text-gray-300">
                                URL Unraid (GraphQL API)
                            </label>
                            <input
                                type="text"
                                id="unraidUrl"
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="http://192.168.1.100:3000/graphql"
                                value={unraidUrl}
                                onChange={(e) => setUnraidUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="unraidKey" className="block text-sm font-medium text-gray-300">
                                Clé API Unraid
                            </label>
                            <input
                                type="password"
                                id="unraidKey"
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="Votre clé API Unraid"
                                value={unraidKey}
                                onChange={(e) => setUnraidKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 pt-2">
                        <button
                            type="button"
                            onClick={handleTestUnraid}
                            disabled={testingUnraid}
                            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {testingUnraid ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Tester la connexion Unraid
                        </button>
                        
                        {unraidTestResult && (
                            <div className={`flex items-center text-sm ${unraidTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {unraidTestResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                )}
                                {unraidTestResult.message}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <h4 className="text-lg font-medium text-white">Jellyseerr</h4>
                        <span className="text-xs text-gray-400 italic">Migration</span>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="jellyseerrUrl" className="block text-sm font-medium text-gray-300">
                                URL Jellyseerr
                            </label>
                            <input
                                type="text"
                                id="jellyseerrUrl"
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="http://192.168.1.100:5055"
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
                                disabled={readOnly} className="mt-1 block w-full disabled:opacity-50 rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                placeholder="Votre clé API Jellyseerr"
                                value={jellyseerrKey}
                                onChange={(e) => setJellyseerrKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                        <button
                            type="button"
                            onClick={handleTestJellyseerr}
                            disabled={testingJellyseerr}
                            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {testingJellyseerr ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Tester la connexion
                        </button>

                        <button
                            type="button"
                            onClick={handleImportJellyseerr}
                            disabled={importingJellyseerr || testingJellyseerr || readOnly}
                            className="flex items-center px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {importingJellyseerr ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <ListPlus className="w-4 h-4 mr-2" />
                            )}
                            Importer les demandes
                        </button>

                        <button
                            type="button"
                            onClick={handleFixMissingTitles}
                            disabled={fixingTitles || readOnly}
                            className="flex items-center px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-md transition-colors disabled:opacity-50 text-sm"
                        >
                            {fixingTitles ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Corriger les noms manquants
                        </button>
                        
                        {jellyseerrTestResult && (
                            <div className={`flex items-center text-sm ${jellyseerrTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {jellyseerrTestResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                )}
                                {jellyseerrTestResult.message}
                            </div>
                        )}

                        {importJellyseerrResult && (
                            <div className={`flex items-center text-sm ${importJellyseerrResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {importJellyseerrResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                ) }
                                {importJellyseerrResult.message}
                            </div>
                        )}

                        {fixTitlesResult && (
                            <div className={`flex items-center text-sm ${fixTitlesResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                {fixTitlesResult.success ? (
                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                )}
                                {fixTitlesResult.message}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={loading || readOnly}
                    className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 sm:w-auto"
                >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Sauvegarder
                </button>
            </div>
        </form>
    )
}
