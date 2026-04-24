'use client'

import type { Webhook } from '../../_types/webhook'
import { getEventLabel } from '../../_utils/webhook-templates'

interface WebhookTemplatesListProps {
    webhook: Webhook
    getDefaultTemplate: (eventId: string) => string
    onUpdateTemplate: (eventId: string, value: string) => void
    onToggleImage: (eventId: string) => void
    helpText: string
}

/**
 * Liste des templates par evenement pour un webhook (Discord ou Evolution API).
 * Rend une textarea par evenement active + checkbox "inclure l'image".
 */
export function WebhookTemplatesList({
    webhook,
    getDefaultTemplate,
    onUpdateTemplate,
    onToggleImage,
    helpText,
}: WebhookTemplatesListProps) {
    if (!webhook.events || webhook.events.length === 0) return null

    return (
        <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
            <label className="block text-sm font-medium text-gray-400">
                Templates par événement (Optionnel)
            </label>
            {webhook.events.map((eventId: string) => {
                const eventLabel = getEventLabel(eventId)
                const defaultValue = getDefaultTemplate(eventId)
                const includeImage = webhook.includeImage?.[eventId] !== undefined
                    ? webhook.includeImage[eventId]
                    : true
                const value = webhook.templates?.[eventId] !== undefined
                    ? webhook.templates[eventId]
                    : defaultValue

                return (
                    <div key={eventId} className="bg-black/20 p-3 rounded-lg border border-white/5 relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-medium text-indigo-300">{eventLabel}</label>
                            <label className="flex items-center gap-1.5 cursor-pointer" title="Joindre l'affiche du média à ce message">
                                <input
                                    type="checkbox"
                                    checked={includeImage}
                                    onChange={() => onToggleImage(eventId)}
                                    className="w-3 h-3 rounded border-gray-600 bg-black/40 text-indigo-500 focus:ring-indigo-500"
                                />
                                <span className="text-[10px] text-gray-400">Inclure l&apos;image</span>
                            </label>
                        </div>
                        <textarea
                            value={value}
                            onChange={(e) => onUpdateTemplate(eventId, e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[80px] text-xs"
                            placeholder={defaultValue}
                        />
                    </div>
                )
            })}
            <p className="text-xs text-gray-500 mt-1">{helpText}</p>
        </div>
    )
}
