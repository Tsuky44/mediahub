'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export type BackupTarget = 'settings' | 'database'

interface ExportOptions {
    endpoint: string
    filenamePrefix: string
    successLabel: string
}

interface ImportOptions {
    endpoint: string
    confirmMessage: string
    successMessage: (count?: number) => string
    reloadAfter?: boolean
}

const EXPORT_CONFIG: Record<BackupTarget, ExportOptions> = {
    settings: {
        endpoint: '/api/admin/settings/export',
        filenamePrefix: 'mediahub-settings',
        successLabel: 'Configuration exportée avec succès',
    },
    database: {
        endpoint: '/api/admin/database/export',
        filenamePrefix: 'mediahub-database',
        successLabel: 'Base de données exportée avec succès',
    },
}

const IMPORT_CONFIG: Record<BackupTarget, ImportOptions> = {
    settings: {
        endpoint: '/api/admin/settings/import',
        confirmMessage: 'Attention : Cette action va écraser les paramètres existants. Voulez-vous continuer ?',
        successMessage: (count?: number) => `Import réussi ! ${count} paramètres mis à jour.`,
    },
    database: {
        endpoint: '/api/admin/database/import',
        confirmMessage: 'ATTENTION CRITIQUE : Cette action va supprimer TOUTES les données actuelles (utilisateurs, requêtes, configurations) et les remplacer par celles du fichier de sauvegarde. Cette action est irréversible. Voulez-vous vraiment continuer ?',
        successMessage: () => 'Restauration de la base de données réussie !',
        reloadAfter: true,
    },
}

export interface UseBackupOperationsResult {
    exportBackup: (target: BackupTarget, password: string) => Promise<boolean>
    importBackup: (target: BackupTarget, file: File, password: string) => Promise<boolean>
}

/**
 * Encapsule les operations d'export/import chiffrees pour les paramatres
 * et la base de donnees (POST encrypted blob, telechargement, restauration).
 */
export function useBackupOperations(): UseBackupOperationsResult {
    const router = useRouter()

    const exportBackup = async (target: BackupTarget, password: string): Promise<boolean> => {
        const cfg = EXPORT_CONFIG[target]
        try {
            const res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Erreur lors de l'export")
            }
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            const date = new Date().toISOString().split('T')[0]
            a.download = `${cfg.filenamePrefix}-${date}.enc`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success(cfg.successLabel)
            return true
        } catch (error: any) {
            toast.error(error.message)
            return false
        }
    }

    const importBackup = async (target: BackupTarget, file: File, password: string): Promise<boolean> => {
        const cfg = IMPORT_CONFIG[target]
        if (!confirm(cfg.confirmMessage)) return false

        try {
            const text = await file.text()
            const res = await fetch(cfg.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: text, password }),
            })
            const result = await res.json()
            if (!res.ok) throw new Error(result.error || "Erreur lors de l'import")

            toast.success(cfg.successMessage(result.count))
            router.refresh()
            if (cfg.reloadAfter) window.location.reload()
            return true
        } catch (error: any) {
            toast.error(error.message)
            return false
        }
    }

    return { exportBackup, importBackup }
}
