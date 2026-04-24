'use client'

import { useState } from 'react'
import { Plus, Save, BellRing, Info } from 'lucide-react'
import { useWebhooks } from '../_hooks/useWebhooks'
import { WEBHOOK_EVENT_TYPES } from '../_utils/webhook-templates'
import { WebhookCard } from './webhooks/WebhookCard'
import { WebhookVariablesModal } from './webhooks/WebhookVariablesModal'

export default function ExternalNotifications() {
    const {
        webhooks,
        usersList,
        loading,
        saving,
        testingId,
        testResult,
        selectedTestEvent,
        setSelectedTestEvent,
        save,
        test,
        addWebhook,
        removeWebhook,
        updateWebhook,
        toggleEvent,
        updateTemplate,
        toggleImage,
    } = useWebhooks()

    const [showVariablesModal, setShowVariablesModal] = useState(false)

    if (loading) {
        return <div className="p-8 text-center text-gray-400">Chargement...</div>
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white">Notifications Externes</h2>
                    <p className="text-sm text-gray-400">
                        Configurez l&apos;envoi de notifications vers Discord, Telegram, ou des webhooks personnalisés.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowVariablesModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors text-sm font-medium border border-indigo-500/20"
                    >
                        <Info size={16} />
                        Variables
                    </button>
                    <button
                        onClick={addWebhook}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/10"
                    >
                        <Plus size={16} />
                        Ajouter
                    </button>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <Save size={16} />
                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                </div>
            </div>

            {showVariablesModal && <WebhookVariablesModal onClose={() => setShowVariablesModal(false)} />}

            <div className="space-y-6">
                {webhooks.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
                        <BellRing size={48} className="mx-auto text-gray-500 mb-4 opacity-50" />
                        <h3 className="text-lg font-medium text-white mb-2">Aucune notification externe</h3>
                        <p className="text-gray-400 mb-6">
                            Ajoutez un webhook pour recevoir des alertes sur vos plateformes préférées.
                        </p>
                        <button
                            onClick={addWebhook}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            Ajouter une notification
                        </button>
                    </div>
                ) : (
                    webhooks.map((webhook, index) => (
                        <WebhookCard
                            key={webhook.id}
                            webhook={webhook}
                            index={index}
                            usersList={usersList}
                            eventTypes={WEBHOOK_EVENT_TYPES}
                            selectedTestEvent={selectedTestEvent[webhook.id]}
                            onSelectTestEvent={(value) => setSelectedTestEvent(prev => ({ ...prev, [webhook.id]: value }))}
                            testingId={testingId}
                            testResult={testResult}
                            onTest={(testType) => test(index, testType)}
                            onUpdate={(field, value) => updateWebhook(index, field, value)}
                            onRemove={() => removeWebhook(index)}
                            onToggleEvent={(event) => toggleEvent(index, event)}
                            onUpdateTemplate={(eventId, value) => updateTemplate(index, eventId, value)}
                            onToggleImage={(eventId) => toggleImage(index, eventId)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
