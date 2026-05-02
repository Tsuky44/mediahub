'use client'

import type { Webhook, WebhookEvent, WebhookTestResult, WebhookTestType, UserOption } from '../../_types/webhook'
import { WebhookRecipients } from './WebhookRecipients'
import { WebhookCardHeader } from './WebhookCardHeader'
import { WebhookTypeSelector } from './WebhookTypeSelector'
import { WebhookEvolutionForm } from './WebhookEvolutionForm'
import { WebhookDiscordForm } from './WebhookDiscordForm'
import { WebhookCustomForm } from './WebhookCustomForm'
import { WebhookTestResult as WebhookTestResultView } from './WebhookTestResult'
import { WebhookEventsList } from './WebhookEventsList'

interface WebhookCardProps {
    webhook: Webhook
    index: number
    usersList: UserOption[]
    eventTypes: WebhookEvent[]
    selectedTestEvent: string | undefined
    onSelectTestEvent: (value: string) => void
    testingId: string | null
    testResult: WebhookTestResult | null
    onTest: (testType: WebhookTestType) => void
    onUpdate: (field: string, value: string | boolean) => void
    onRemove: () => void
    onToggleEvent: (event: string) => void
    onUpdateTemplate: (eventId: string, value: string) => void
    onToggleImage: (eventId: string) => void
}

/** Carte d'un webhook : configuration complete (type, url, templates, destinataires, evenements, test). */
export function WebhookCard({
    webhook,
    usersList,
    eventTypes,
    selectedTestEvent,
    onSelectTestEvent,
    testingId,
    testResult,
    onTest,
    onUpdate,
    onRemove,
    onToggleEvent,
    onUpdateTemplate,
    onToggleImage,
}: WebhookCardProps) {
    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6 relative group">
            <WebhookCardHeader
                webhook={webhook}
                eventTypes={eventTypes}
                selectedTestEvent={selectedTestEvent}
                testingId={testingId}
                onSelectTestEvent={onSelectTestEvent}
                onTest={onTest}
                onRemove={onRemove}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nom (identifiant)</label>
                        <input
                            type="text"
                            value={webhook.name}
                            onChange={(e) => onUpdate('name', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            placeholder="Ex: Mon serveur Discord"
                        />
                    </div>

                    <WebhookTypeSelector value={webhook.type} onChange={(type) => onUpdate('type', type)} />

                    <div className="flex items-center gap-3 mt-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={webhook.enabled}
                                onChange={(e) => onUpdate('enabled', e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                            <span className="ml-3 text-sm font-medium text-gray-300">Activer cette notification</span>
                        </label>
                    </div>

                    <WebhookRecipients webhook={webhook} usersList={usersList} onUpdate={onUpdate} />
                </div>

                <div className="space-y-4">
                    {webhook.type === 'evolution' ? (
                        <WebhookEvolutionForm
                            webhook={webhook}
                            onUpdate={onUpdate}
                            onUpdateTemplate={onUpdateTemplate}
                            onToggleImage={onToggleImage}
                        />
                    ) : webhook.type === 'discord' ? (
                        <WebhookDiscordForm
                            webhook={webhook}
                            onUpdate={onUpdate}
                            onUpdateTemplate={onUpdateTemplate}
                            onToggleImage={onToggleImage}
                        />
                    ) : (
                        <WebhookCustomForm webhook={webhook} onUpdate={onUpdate} />
                    )}

                    <WebhookTestResultView result={testResult} webhookId={webhook.id} />
                </div>
            </div>

            <WebhookEventsList
                webhook={webhook}
                eventTypes={eventTypes}
                onToggleEvent={onToggleEvent}
            />
        </div>
    )
}
