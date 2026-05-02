'use client'

import type { User } from '../../_types/user'

interface NotificationsEditorProps {
  user: User
  onUpdate: (field: string, value: string) => void
  onStop: () => void
}

/** Formulaire inline d'edition des notifications (onBlur pour chaque champ). */
export function NotificationsEditor({ user, onUpdate, onStop }: NotificationsEditorProps) {
    return (
        <div className="flex flex-col gap-2 min-w-[200px]">
            <input
                type="text"
                placeholder="WhatsApp (ex: +33612...)"
                defaultValue={user.whatsappNumber || ''}
                onBlur={(e) => onUpdate('whatsappNumber', e.target.value)}
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <input
                type="text"
                placeholder="Telegram Chat ID"
                defaultValue={user.telegramChatId || ''}
                onBlur={(e) => onUpdate('telegramChatId', e.target.value)}
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <input
                type="text"
                placeholder="Discord User ID (ex: 123456789)"
                defaultValue={user.discordUserId || ''}
                onBlur={(e) => onUpdate('discordUserId', e.target.value)}
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <input
                type="text"
                placeholder="Discord Webhook URL"
                defaultValue={user.discordWebhook || ''}
                onBlur={(e) => onUpdate('discordWebhook', e.target.value)}
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <input
                type="text"
                placeholder="Custom Webhook URL"
                defaultValue={user.customWebhook || ''}
                onBlur={(e) => onUpdate('customWebhook', e.target.value)}
                className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white"
            />
            <button onClick={onStop} className="text-xs text-indigo-400 hover:text-indigo-300 self-end">Terminer</button>
        </div>
    )
}
