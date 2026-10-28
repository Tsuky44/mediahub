'use client'

import { User as UserIcon, Monitor } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

import {
    formatIpAddress,
    formatLogDetails,
    formatUserAgent,
    getActionColor,
    getActionLabel,
    getLogUserDisplayName,
    getLogUserSubtitle,
    parseLogDetails,
} from '../../_utils/activity-logs'
import type { ActivityLog } from '../../_types/activity-logs'

interface ActivityLogRowProps {
    log: ActivityLog
}

export default function ActivityLogRow({ log }: ActivityLogRowProps) {
    const details = parseLogDetails(log.details)
    const displayName = getLogUserDisplayName(log, details)
    const userSubtitle = getLogUserSubtitle(log, details)
    const isSystem = !log.user && (!log.userId || log.userId <= 0)
    const ip = formatIpAddress(log.ipAddress || (typeof details.ipAddress === 'string' ? details.ipAddress : null))
    const browser = formatUserAgent(log.userAgent || (typeof details.userAgent === 'string' ? details.userAgent : null))

    return (
        <tr className="hover:bg-white/5 transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    {log.user?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            loading="lazy"
                            decoding="async"
                            src={log.user.image}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isSystem
                                    ? 'bg-gray-500/20 text-gray-400'
                                    : 'bg-indigo-500/20 text-indigo-400'
                            }`}
                        >
                            <UserIcon size={14} />
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-white">{displayName}</p>
                        {userSubtitle && (
                            <p className="text-xs text-gray-500">{userSubtitle}</p>
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
            <td className="px-4 py-3 text-gray-300 max-w-md">
                <p className="truncate" title={formatLogDetails(log, details)}>
                    {formatLogDetails(log, details)}
                </p>
            </td>
            <td className="px-4 py-3 text-gray-500 text-xs">
                <p>{ip}</p>
                {browser && (
                    <p className="flex items-center gap-1 text-gray-600 mt-0.5" title={log.userAgent || undefined}>
                        <Monitor size={10} className="shrink-0" />
                        <span className="truncate max-w-[120px]">{browser}</span>
                    </p>
                )}
            </td>
            <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                {format(new Date(log.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
            </td>
        </tr>
    )
}
