'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'

export interface ContainerUpdateStatus {
    name: string
    currentVersion: string
    latestVersion: string
    updateAvailable: boolean
    imageName: string
    error?: string
}

export interface SystemUpdateStatus {
    app: ContainerUpdateStatus
    tracker: ContainerUpdateStatus | null
    checkedAt: string
}

export function useSystemUpdate() {
    const [loading, setLoading] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [status, setStatus] = useState<SystemUpdateStatus | null>(null)

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

    const performUpdate = useCallback(async () => {
        if (!confirm('Êtes-vous sûr de vouloir mettre à jour les conteneurs ? Les services seront interrompus pendant quelques instants.')) return

        setUpdating(true)
        try {
            const res = await fetch('/api/admin/system/update', { method: 'POST' })
            if (!res.ok) throw new Error('Update failed')
            toast.success('Mise à jour lancée ! Les conteneurs vont redémarrer...')
            setTimeout(() => {
                window.location.reload()
            }, 15000)
        } catch (error) {
            console.error(error)
            toast.error('Échec du lancement de la mise à jour')
            setUpdating(false)
        }
    }, [])

    return {
        loading,
        updating,
        status,
        checkUpdate,
        performUpdate,
    }
}
