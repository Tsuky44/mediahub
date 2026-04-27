'use client'

import { User as UserIcon } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import {
    formatLogDetails,
    getActionColor,
    getActionLabel,
    parseLogDetails,
} from '../../_utils/activity-logs'
import type { ActivityLog } from '../../_types/activity-logs'

interface ActivityLogRowProps {
    log: ActivityLog
}

export default function ActivityLogRow({ log }: ActivityLogRowProps) {
    const details = parseLogDetails(log.details)

    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    {log.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={log.user.image}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <UserIcon size={14} />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-white">
                            {log.user?.name || 'Système'}
                        </p>
                        {log.user?.email && (
                            <p className="text-xs text-gray-500">{log.user.email}</p>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}
                >
                    {getActionLabel(log.action)}
                </span>
            </td>
            <td className="px-4 py-3 text-gray-300">{formatLogDetails(log, details)}</td>
            <td className="px-4 py-3 text-gray-500 text-xs">
                {log.ipAddress || details.ipAddress || '-'}
            </td>
            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                {format(new Date(log.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            </td>
        </tr>
    )
}
