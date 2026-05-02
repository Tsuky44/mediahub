'use client'

import Image from 'next/image'
import type { User, UserRole } from '../../_types/user'
import { NotificationsEditor } from './NotificationsEditor'

interface UserTableRowProps {
    user: User
    roles: UserRole[]
    isSelected: boolean
    isUpdating: boolean
    readOnly: boolean
    isEditingNotifications: boolean
    onToggleSelect: () => void
    onRoleChange: (value: string) => void
    onStartEditNotifications: () => void
    onStopEditNotifications: () => void
    onUpdateNotification: (field: string, value: string) => void
}

/** Badge de provider (Emby/Plex/Jellyfin/Local). */
function ProviderBadges({ user }: { user: User }) {
    return (
        <div className="flex gap-1">
            {user.embyUserId && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">Emby</span>
            )}
            {user.plexUserId && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">Plex</span>
            )}
            {user.jellyfinUserId && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">Jellyfin</span>
            )}
            {!user.embyUserId && !user.plexUserId && !user.jellyfinUserId && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">Local</span>
            )}
        </div>
    )
}

/** Badges des notifications configurees pour l'utilisateur. */
function NotificationsBadges({ user, readOnly, onEdit }: { user: User; readOnly: boolean; onEdit: () => void }) {
    const hasAny = user.whatsappNumber || user.telegramChatId || user.discordUserId || user.discordWebhook || user.customWebhook
    return (
        <div
            className="flex gap-1 flex-wrap cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
            onClick={() => !readOnly && onEdit()}
            title={readOnly ? '' : 'Cliquez pour modifier les notifications de cet utilisateur'}
        >
            {user.whatsappNumber && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20" title={user.whatsappNumber}>WhatsApp</span>
            )}
            {user.telegramChatId && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20" title={user.telegramChatId}>Telegram</span>
            )}
            {user.discordUserId && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20" title={user.discordUserId}>Discord ID</span>
            )}
            {user.discordWebhook && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title="Configuré">Discord Webhook</span>
            )}
            {user.customWebhook && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Configuré">Webhook</span>
            )}
            {!hasAny && (
                <span className="text-xs text-gray-600 hover:text-gray-400">Ajouter...</span>
            )}
        </div>
    )
}

export function UserTableRow({
    user,
    roles,
    isSelected,
    isUpdating,
    readOnly,
    isEditingNotifications,
    onToggleSelect,
    onRoleChange,
    onStartEditNotifications,
    onStopEditNotifications,
    onUpdateNotification,
}: UserTableRowProps) {
    return (
        <tr className={`group transition-colors ${isSelected ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/5'}`}>
            <td className="py-4 pl-6">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                    className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                />
            </td>
            <td className="py-4">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700">
                        {user.image ? (
                            <Image src={user.image} alt={user.name || ''} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                {user.name?.[0]?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <span className="font-medium text-white">{user.name}</span>
                </div>
            </td>
            <td className="py-4 text-gray-300">{user.email}</td>
            <td className="py-4">
                <ProviderBadges user={user} />
            </td>
            <td className="py-4">
                {isEditingNotifications ? (
                    <NotificationsEditor user={user} onUpdate={onUpdateNotification} onStop={onStopEditNotifications} />
                ) : (
                    <NotificationsBadges user={user} readOnly={readOnly} onEdit={onStartEditNotifications} />
                )}
            </td>
            <td className="py-4 pr-6">
                <select
                    value={user.role === 'admin' ? 'admin' : (user.roleId || '')}
                    onChange={(e) => onRoleChange(e.target.value)}
                    disabled={readOnly || isUpdating}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-w-[200px]"
                >
                    <option value="">Aucun rôle</option>
                    <optgroup label="Système">
                        <option value="admin">Administrateur (Accès complet)</option>
                    </optgroup>
                    {roles.length > 0 && (
                        <optgroup label="Rôles personnalisés">
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </optgroup>
                    )}
                </select>
            </td>
        </tr>
    )
}
