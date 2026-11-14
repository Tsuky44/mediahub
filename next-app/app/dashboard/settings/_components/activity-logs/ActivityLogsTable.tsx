'use client'

import { Loader2 } from 'lucide-react'

import ActivityLogRow from './ActivityLogRow'
import type { ActivityLog } from '../../_types/activity-logs'

interface ActivityLogsTableProps {
    logs: ActivityLog[]
    loading: boolean
}

export default function ActivityLogsTable({ logs, loading }: ActivityLogsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm max-md:block">
                <thead className="bg-black/40 text-gray-400 max-md:hidden">
                    <tr>
                        <th className="px-4 py-3 font-medium">Utilisateur</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 font-medium">Détails</th>
                        <th className="px-4 py-3 font-medium">Origine</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5 max-md:block [&>tr>td[colspan]]:max-md:block">
                    {loading && logs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                Chargement des logs...
                            </td>
                        </tr>
                    ) : logs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                Aucun log trouvé
                            </td>
                        </tr>
                    ) : (
                        logs.map(log => <ActivityLogRow key={log.id} log={log} />)
                    )}
                </tbody>
            </table>
        </div>
    )
}
