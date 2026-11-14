'use client'

import Image from 'next/image'
import { BRAND, ONYX_BRAND } from '@/lib/media-server-brand'
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

/** Badge de provider (Emby/Plex/Jellyfin/Onyx/Local). */
function ProviderBadges({ user }: { user: User }) {
    return (
        <div className="flex gap-1">
            {user.embyUserId && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${BRAND.emby.badge}`}>Emby</span>
            )}
            {user.plexUserId && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${BRAND.plex.badge}`}>Plex</span>
            )}
            {user.jellyfinUserId && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${BRAND.jellyfin.badge}`}>Jellyfin</span>
            )}
            {user.onyxUserId && (
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${ONYX_BRAND.badge}`}>Onyx</span>
            )}
            {!user.embyUserId && !user.plexUserId && !user.jellyfinUserId && !user.onyxUserId && (
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
            className="flex min-h-8 items-center gap-1 flex-wrap cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
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
                <span className="text-xs text-gray-500 hover:text-gray-300">Ajouter...</span>
            )}
        </div>
    )
}

function UserAvatar({ user }: { user: User }) {
    return (
        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-gray-700">
            {user.image ? (
                <Image src={user.image} alt={user.name || ''} fill className="object-cover" />
            ) : (
                <div className="flex size-full items-center justify-center font-bold text-gray-400">
                    {user.name?.[0]?.toUpperCase()}
                </div>
            )}
        </div>
    )
}

function RoleSelect({ user, roles, disabled, onChange, className }: {
    user: User
    roles: UserRole[]
    disabled: boolean
    onChange: (value: string) => void
    className?: string
}) {
    return (
        <select
            value={user.role === 'admin' ? 'admin' : (user.roleId || '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            aria-label={`Rôle de ${user.name}`}
            className={`bg-black/20 border border-white/10 rounded-lg px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${className ?? ''}`}
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
            <td className="py-4 pr-4">
                <div className="flex items-center gap-3">
                    <UserAvatar user={user} />
                    <span className="font-medium text-white">{user.name}</span>
                </div>
            </td>
            <td className="py-4 pr-4 text-gray-300">{user.email}</td>
            <td className="py-4 pr-4">
                <ProviderBadges user={user} />
            </td>
            <td className="py-4 pr-4">
                {isEditingNotifications ? (
                    <NotificationsEditor user={user} onUpdate={onUpdateNotification} onStop={onStopEditNotifications} />
                ) : (
                    <NotificationsBadges user={user} readOnly={readOnly} onEdit={onStartEditNotifications} />
                )}
            </td>
            <td className="py-4 pr-6">
                <RoleSelect
                    user={user}
                    roles={roles}
                    disabled={readOnly || isUpdating}
                    onChange={onRoleChange}
                    className="min-w-[200px] py-1.5"
                />
            </td>
        </tr>
    )
}

/** Même utilisateur en carte, pour téléphone : tout tient dans la largeur, sans défilement horizontal */
export function UserMobileCard({
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
        <li className={`space-y-3 p-4 ${isSelected ? 'bg-indigo-500/5' : ''}`}>
            <div className="flex items-center gap-3">
                <UserAvatar user={user} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-white">{user.name}</span>
                        <ProviderBadges user={user} />
                    </div>
                    <p className="truncate text-sm text-gray-400">{user.email}</p>
                </div>
                {/* Zone tactile de 44 px autour de la case */}
                <label className="-mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        aria-label={`Sélectionner ${user.name}`}
                        className="size-5 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                </label>
            </div>
            <RoleSelect
                user={user}
                roles={roles}
                disabled={readOnly || isUpdating}
                onChange={onRoleChange}
                className="min-h-11 w-full py-2"
            />
            <div className="flex items-start gap-2">
                <span className="pt-1.5 text-xs text-gray-500">Notifications</span>
                <div className="min-w-0 flex-1">
                    {isEditingNotifications ? (
                        <NotificationsEditor user={user} onUpdate={onUpdateNotification} onStop={onStopEditNotifications} />
                    ) : (
                        <NotificationsBadges user={user} readOnly={readOnly} onEdit={onStartEditNotifications} />
                    )}
                </div>
            </div>
        </li>
    )
}
