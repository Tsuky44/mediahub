import { RefreshCw, Download, Loader2, Server, Activity } from 'lucide-react'
import { useSystemUpdate } from './system-update/useSystemUpdate'
import { ContainerStatusCard } from './system-update/ContainerStatusCard'

export const SystemUpdate = () => {
    const { loading, updating, status, checkUpdate, performUpdate } = useSystemUpdate()

    const hasUpdates = status && (status.app.updateAvailable || (status.tracker?.updateAvailable))

    return (
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-6 mt-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white">Mise à jour du système</h3>
                        <p className="text-sm text-gray-400">Gérer les mises à jour des conteneurs (App & Tracker)</p>
                    </div>
                </div>

                <button
                    onClick={() => checkUpdate(true)}
                    disabled={loading || updating}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    Vérifier
                </button>
            </div>

            {status && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ContainerStatusCard status={status.app} icon={Server} />
                        {status.tracker && <ContainerStatusCard status={status.tracker} icon={Activity} />}
                    </div>

                    {hasUpdates && (
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={performUpdate}
                                disabled={updating}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg shadow-green-900/20 flex items-center gap-2 font-medium"
                            >
                                {updating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                                Tout mettre à jour
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
