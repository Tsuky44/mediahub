'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'

export interface ContainerUpdateStatus {
    name: string
    currentVersion: string
    latestVersion: string
    updateAvailable: boolean
    imageName: string
    availableTags: string[]
    error?: string
}

export interface ChangelogCategory {
    added?: string[]
    fixed?: string[]
    changed?: string[]
    security?: string[]
}

export interface ChangelogVersion {
    version: string
    date: string
    changes: ChangelogCategory
}

export interface SystemUpdateStatus {
    app: ContainerUpdateStatus
    tracker: ContainerUpdateStatus | null
    checkedAt: string
    changelog: ChangelogVersion[]
}

export function useSystemUpdate() {
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [status, setStatus] = useState<SystemUpdateStatus | null>(null)
    
    const [updateLogs, setUpdateLogs] = useState<string>('')
    const [updateState, setUpdateState] = useState<string>('idle')
    const [updateStep, setUpdateStep] = useState<string | null>(null)
    const [progressPercent, setProgressPercent] = useState<number>(0)
    const [progressCurrentMB, setProgressCurrentMB] = useState<number>(0)
    const [progressTotalMB, setProgressTotalMB] = useState<number>(0)
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const updateTriggeredRef = useRef<boolean>(false)

    const checkUpdate = useCallback(async (force: boolean = false) => {
        setLoading(true)
        try {
            const url = force ? '/api/admin/system/update?force=true' : '/api/admin/system/update'
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to check for updates')
            const data = await res.json()
            setStatus(data)

            const hasUpdates = data.app.updateAvailable || (data.tracker && data.tracker.updateAvailable)
            if (hasUpdates) {
                toast.success('Mise à jour disponible !')
            } else if (force) {
                toast.success('Système à jour')
            }
        } catch (error) {
            console.error(error)
            toast.error('Impossible de vérifier les mises à jour')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        checkUpdate(false)
    }, [checkUpdate])

    // Clean up interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
            }
        }
    }, [])

    // Poll logs function
    const startPollingLogs = useCallback(() => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
        
        let consecutiveErrors = 0;
        let isSuccessStateReached = false;

        pollingIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch('/api/admin/system/update/logs')
                
                // If we get a response, reset consecutive errors
                consecutiveErrors = 0;

                if (!res.ok) {
                    // Log error but don't stop, server might be restarting
                    console.warn('[useSystemUpdate] Polling logs failed with status:', res.status)
                    return;
                }

                const data = await res.json()
                if (data.logs) {
                    setUpdateLogs(data.logs)
                    if (data.logs.includes('[SYSTEM]') && data.logs.includes('Initialisation')) {
                        updateTriggeredRef.current = true;
                    }
                }
                if (typeof data.step === 'string') {
                    setUpdateStep(data.step)
                }
                if (typeof data.progressPercent === 'number') {
                    setProgressPercent(data.progressPercent)
                }
                if (typeof data.progressCurrentMB === 'number') {
                    setProgressCurrentMB(data.progressCurrentMB)
                }
                if (typeof data.progressTotalMB === 'number') {
                    setProgressTotalMB(data.progressTotalMB)
                }
                if (data.status) {
                    setUpdateState(data.status)
                    
                    if (data.status === 'success' && !isSuccessStateReached) {
                        isSuccessStateReached = true;
                        toast.success('Mise à jour réussie ! Rechargement de la page...')
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
                        setTimeout(() => {
                            window.location.reload()
                        }, 5000)
                    } else if (data.status.startsWith('failed')) {
                        setUpdating(false)
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
                        
                        if (data.status === 'failed_rollback') {
                            toast.error('Échec de la mise à jour ! Le système a fait un rollback sécurisé.')
                        } else {
                            toast.error('Une erreur fatale est survenue lors de la mise à jour.')
                        }
                    }
                }
            } catch (err) {
                // Fetch failed, probably because the container is stopping/restarting.
                // This is normal and expected!
                consecutiveErrors++;
                console.log(`[useSystemUpdate] Connection lost (normal during restart), trial ${consecutiveErrors}`)
                
                // Show a nice indicator in logs
                setUpdateLogs(prev => {
                    if (prev && !prev.endsWith('...\n') && !prev.includes('Connexion au serveur perdue (redémarrage)')) {
                        return prev + '\n[INFO] Connexion au serveur perdue (redémarrage en cours)... Tentative de reconconnexion...\n'
                    }
                    return prev
                })
            }
        }, 1200)
    }, [])

    const performUpdate = useCallback(async (targetTag?: string) => {
        console.log('[useSystemUpdate] performUpdate called with tag:', targetTag);
        const isSwitch = !!targetTag;
        const msg = isSwitch 
            ? `Êtes-vous sûr de vouloir basculer vers la version ${targetTag} ? Les services seront interrompus pendant quelques instants.`
            : 'Êtes-vous sûr de vouloir mettre à jour les conteneurs ? Les services seront interrompus pendant quelques instants.'
        
        console.log('[useSystemUpdate] Showing confirm dialog');
        if (!confirm(msg)) {
            console.log('[useSystemUpdate] User cancelled');
            return;
        }

        console.log('[useSystemUpdate] User confirmed, starting update...');
        setUpdating(true)
        setUpdateLogs('Démarrage de la mise à jour...\n')
        setUpdateState('in_progress')
        updateTriggeredRef.current = false
        
        // Start polling logs immediately
        startPollingLogs()

        try {
            const body = JSON.stringify({ tag: targetTag });
            console.log('[useSystemUpdate] Sending POST request with body:', body);
            const res = await fetch('/api/admin/system/update', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body
            })
            console.log('[useSystemUpdate] Response status:', res.status);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[useSystemUpdate] Error response:', errorData);
                throw new Error(errorData.error || 'Update failed');
            }
            
            const data = await res.json();
            console.log('[useSystemUpdate] Success response:', data);
            toast.success(isSwitch ? `Bascule vers la version ${targetTag} lancée !` : 'Mise à jour lancée !')
        } catch (error: any) {
            console.error('[useSystemUpdate] Error:', error)
            toast.error(isSwitch ? 'La réponse du serveur a été interrompue' : 'La réponse du serveur a été interrompue')
            setUpdateLogs(prev => prev + `\n[AVERTISSEMENT] ${error.message}\n[INFO] Vérification de l'état en arrière-plan...\n`)
            
            // Keep polling alive: the server may have already started the update
            // before the connection dropped. Only give up after 8s if no logs appear.
            setTimeout(() => {
                if (!updateTriggeredRef.current) {
                    setUpdateState('failed')
                    setUpdating(false)
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
                    toast.error(isSwitch ? 'Échec de la bascule de version' : 'Échec du lancement de la mise à jour')
                }
            }, 8000)
        }
    }, [startPollingLogs])

    return {
        loading,
        updating,
        status,
        updateLogs,
        updateState,
        updateStep,
        progressPercent,
        progressCurrentMB,
        progressTotalMB,
        checkUpdate,
        performUpdate,
    }
}
