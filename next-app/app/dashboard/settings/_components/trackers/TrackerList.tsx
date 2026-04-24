'use client'

import { AlertCircle, TestTube, Edit2, Trash2 } from 'lucide-react'
import type { TrackerConfig } from '../../_types/tracker'

interface TrackerListProps {
    trackers: TrackerConfig[]
    testingId: string | null
    onTest: (tracker: TrackerConfig) => void
    onEdit: (tracker: TrackerConfig) => void
    onDelete: (id: string) => void
}

/** Liste des trackers configures avec actions (test, edit, delete). */
export function TrackerList({ trackers, testingId, onTest, onEdit, onDelete }: TrackerListProps) {
    if (trackers.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun tracker configuré</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {trackers.map(tracker => (
                <div
                    key={tracker.id}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${tracker.enabled ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                        <div>
                            <div className="font-medium text-white">{tracker.name}</div>
                            <div className="text-xs text-gray-500">
                                {tracker.type} • {tracker.baseUrl}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onTest(tracker)}
                            disabled={testingId === tracker.id}
                            className="p-2 text-gray-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
                            title="Tester la connexion"
                        >
                            <TestTube className={`w-4 h-4 ${testingId === tracker.id ? 'animate-pulse' : ''}`} />
                        </button>
                        <button
                            onClick={() => onEdit(tracker)}
                            className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                            title="Modifier"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => onDelete(tracker.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
