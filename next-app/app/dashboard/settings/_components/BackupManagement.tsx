'use client'

import { useBackupOperations } from '../_hooks/useBackupOperations'
import { BackupExportCard } from './backup/BackupExportCard'
import { BackupImportCard } from './backup/BackupImportCard'

const SETTINGS_IMPORT_WARNING = {
    message: "L'importation mettra à jour vos paramètres actuels.",
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-200',
    iconColor: 'text-yellow-500',
}

const DATABASE_IMPORT_WARNING = {
    message: 'ATTENTION: Cette action supprimera TOUTES les données actuelles pour les remplacer par celles de la sauvegarde.',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-200',
    iconColor: 'text-red-500',
}

/**
 * Page de gestion des sauvegardes : export/import chiffres pour les paramatres
 * et la base de donnees complete. Compose 4 cartes (BackupExportCard + BackupImportCard).
 */
export default function BackupManagement() {
    const { exportBackup, importBackup } = useBackupOperations()

    return (
        <div className="space-y-12">
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4">
                    Sauvegarde des Paramètres
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BackupExportCard
                        title="Exporter la configuration"
                        description="Sauvegardez uniquement vos paramètres (URL, clés API, etc.) dans un fichier sécurisé."
                        submitLabel="Exporter les paramètres"
                        color="blue"
                        iconColor="text-blue-400"
                        onExport={(password) => exportBackup('settings', password)}
                    />
                    <BackupImportCard
                        title="Importer la configuration"
                        submitLabel="Importer les paramètres"
                        color="emerald"
                        iconColor="text-emerald-400"
                        warning={SETTINGS_IMPORT_WARNING}
                        onImport={(file, password) => importBackup('settings', file, password)}
                    />
                </div>
            </div>

            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 flex items-center gap-2">
                    Sauvegarde Complète (Base de données)
                    <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">
                        Zone Critique
                    </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BackupExportCard
                        title="Sauvegarde Complète"
                        description="Sauvegardez TOUTES les données (Utilisateurs, Requêtes, Historique, Paramètres, etc.)."
                        submitLabel="Sauvegarder la BDD"
                        color="purple"
                        iconColor="text-purple-400"
                        onExport={(password) => exportBackup('database', password)}
                    />
                    <BackupImportCard
                        title="Restauration Complète"
                        submitLabel="Restaurer la BDD"
                        color="red"
                        iconColor="text-red-400"
                        warning={DATABASE_IMPORT_WARNING}
                        onImport={(file, password) => importBackup('database', file, password)}
                    />
                </div>
            </div>
        </div>
    )
}
