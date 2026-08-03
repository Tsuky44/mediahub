'use client'

import { RefreshCw, User as UserIcon, Filter } from 'lucide-react'

import { ACTION_FILTER_OPTIONS } from '../../_constants/activity-logs'
import { formatLogUserOptionLabel } from '../../_utils/activity-logs'
import type {
    ActivityLogUserOption,
    ActivityLogsFilters,
} from '../../_types/activity-logs'

interface ActivityLogsToolbarProps {
    users: ActivityLogUserOption[]
    filters: ActivityLogsFilters
    importing: boolean
    onImport: () => void
    onFilterChange: <K extends keyof ActivityLogsFilters>(key: K, value: ActivityLogsFilters[K]) => void
}

export default function ActivityLogsToolbar({
    users,
    filters,
    importing,
    onImport,
    onFilterChange,
}: ActivityLogsToolbarProps) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Journal d&apos;activité</h2>
                    <button
                        onClick={onImport}
                        disabled={importing}
                        title="Importer l'historique des demandes dans les logs"
                        className="p-1.5 rounded-md bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={14} className={importing ? 'animate-spin' : ''} />
                    </button>
                </div>
                <p className="text-sm text-gray-400">
                    Historique complet des actions utilisateurs sur le serveur
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-48">
                    <select
                        value={filters.userId}
                        onChange={e => onFilterChange('userId', e.target.value)}
                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 appearance-none"
                    >
                        <option value="">Tous les utilisateurs</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {formatLogUserOptionLabel(u.name, u.email)}
                            </option>
                        ))}
                    </select>
                    <UserIcon
                        size={16}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                </div>

                <div className="relative w-full sm:w-48">
                    <select
                        value={filters.action}
                        onChange={e => onFilterChange('action', e.target.value)}
                        className="w-full bg-gray-900/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 appearance-none"
                    >
                        {ACTION_FILTER_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <Filter
                        size={16}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    />
                </div>
            </div>
        </div>
    )
}
