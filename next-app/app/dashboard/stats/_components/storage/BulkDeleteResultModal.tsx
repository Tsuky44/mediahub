'use client'

import { CheckCircle2, HardDrive } from 'lucide-react'
import { formatBytes } from '../../_utils/storage-formatters'

interface BulkDeleteResultModalProps {
    successCount: number
    failedCount: number
    freedBytes: number
    onClose: () => void
}

/**
 * Popup affiché après une suppression groupée réussie,
 * indiquant l'espace disque récupéré.
 */
export function BulkDeleteResultModal({
    successCount,
    failedCount,
    freedBytes,
    onClose,
}: BulkDeleteResultModalProps) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#0A0A0A]/95 border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden ring-1 ring-emerald-500/20 animate-in zoom-in-95 duration-200">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-emerald-400" />

                <div className="flex flex-col items-center text-center pt-2">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl mb-4">
                        <CheckCircle2 className="text-emerald-400 w-10 h-10" />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">
                        Suppression terminée
                    </h3>

                    <p className="text-gray-400 text-sm mb-6">
                        {successCount} média{successCount > 1 ? 's' : ''} supprimé{successCount > 1 ? 's' : ''}
                        {failedCount > 0 && (
                            <span className="text-amber-400">
                                {' '}• {failedCount} en échec
                            </span>
                        )}
                    </p>

                    <div className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-6">
                        <div className="flex items-center justify-center gap-2 text-emerald-400/80 text-xs uppercase tracking-wider font-bold mb-2">
                            <HardDrive size={14} />
                            Espace récupéré
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {formatBytes(freedBytes)}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}
