import { CheckCircle } from 'lucide-react'
import type { ContainerUpdateStatus } from './useSystemUpdate'

interface ContainerStatusCardProps {
    status: ContainerUpdateStatus
    icon: React.ComponentType<{ size?: number; className?: string }>
}

export function ContainerStatusCard({ status, icon: Icon }: ContainerStatusCardProps) {
    return (
        <div className="bg-black/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="text-indigo-400" />
                <span className="font-medium text-gray-200">{status.name}</span>
                {status.error && (
                    <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded ml-auto">
                        Erreur
                    </span>
                )}
            </div>

            {status.error ? (
                <div className="text-sm text-red-400/80">{status.error}</div>
            ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wider">Image</span>
                        <code className="text-gray-300 text-xs break-all">{status.imageName}</code>
                    </div>
                    <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wider">Version</span>
                        <code className="text-blue-400 font-mono">{status.currentVersion}</code>
                    </div>
                </div>
            )}

            {status.updateAvailable && (
                 <div className="bg-green-500/10 border border-green-500/20 rounded p-2 flex items-center gap-2 mt-2">
                    <CheckCircle size={14} className="text-green-400" />
                    <div>
                        <span className="text-green-400 text-sm font-medium block">Mise à jour disponible</span>
                        <span className="text-gray-400 text-xs">Nouvelle version : {status.latestVersion}</span>
                    </div>
                </div>
            )}

            {!status.updateAvailable && !status.error && (
                <div className="flex items-center gap-2 text-gray-500 text-sm mt-2 pt-2 border-t border-white/5">
                    <CheckCircle size={14} className="text-green-600" />
                    À jour
                </div>
            )}
        </div>
    )
}
