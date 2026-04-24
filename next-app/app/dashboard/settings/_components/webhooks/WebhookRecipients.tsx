'use client'

import { BellRing } from 'lucide-react'
import type { Webhook, UserOption } from '../../_types/webhook'

interface WebhookRecipientsProps {
    webhook: Webhook
    usersList: UserOption[]
    onUpdate: (field: string, value: any) => void
}

/**
 * Section "Destinataires" d'un webhook : toggle notifyRequester + liste de targetUsers (chips).
 */
export function WebhookRecipients({ webhook, usersList, onUpdate }: WebhookRecipientsProps) {
    const targetUsers = webhook.targetUsers || []

    return (
        <div className="mt-6 p-4 bg-black/20 rounded-lg border border-white/5">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <BellRing size={14} className="text-indigo-400" />
                Destinataires (Qui reçoit cette notification ?)
            </h4>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input
                    type="checkbox"
                    checked={webhook.notifyRequester !== false}
                    onChange={(e) => onUpdate('notifyRequester', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-black/40 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm text-gray-300">
                    Notifier automatiquement l&apos;utilisateur qui a demandé le média
                </span>
            </label>

            <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-400">
                    Ajouter des destinataires fixes (ex: Admin) :
                </label>
                <select
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                    onChange={(e) => {
                        const val = e.target.value
                        if (!val) return
                        if (!targetUsers.includes(val)) {
                            onUpdate('targetUsers', [...targetUsers, val])
                        }
                        e.target.value = ''
                    }}
                >
                    <option value="">-- Sélectionner un utilisateur --</option>
                    {usersList.map(u => (
                        <option key={u.id} value={u.id.toString()}>{u.name || u.email}</option>
                    ))}
                </select>

                {targetUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {targetUsers.map((targetId: string) => {
                            const user = usersList.find(u => u.id.toString() === targetId)
                            return (
                                <span
                                    key={targetId}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs border border-indigo-500/30"
                                >
                                    {user ? (user.name || user.email) : `User #${targetId}`}
                                    <button
                                        onClick={() => onUpdate('targetUsers', targetUsers.filter(id => id !== targetId))}
                                        className="hover:text-white ml-1"
                                    >
                                        ×
                                    </button>
                                </span>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
