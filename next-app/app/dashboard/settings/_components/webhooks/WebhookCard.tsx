'use client'

import { Trash2, MessageSquare, Webhook as WebhookIcon, CheckCircle2, XCircle } from 'lucide-react'
import type { Webhook, WebhookEvent, WebhookTestResult, WebhookTestType, UserOption } from '../../_types/webhook'
import { getDefaultDiscordTemplate, getDefaultEvolutionTemplate } from '../../_utils/webhook-templates'
import { WebhookRecipients } from './WebhookRecipients'
import { WebhookTemplatesList } from './WebhookTemplatesList'

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
    onUpdate: (field: string, value: any) => void
    onRemove: () => void
    onToggleEvent: (event: string) => void
    onUpdateTemplate: (eventId: string, value: string) => void
    onToggleImage: (eventId: string) => void
}

const TEMPLATE_HELP_EVOLUTION = 'Variables: {title}, {message}, {year}, {overview}, {rating}, {genres}, {user}, {quality}, {size}, {indexer}, {release}, {poster}. Format autorisé (*gras*, _italique_).'
const TEMPLATE_HELP_DISCORD = 'Variables: {title}, {message}, {year}, {overview}, {rating}, {genres}, {user}, {quality}, {size}, {indexer}, {release}, {poster}. Laisser vide pour le format par défaut.'

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
    const isTesting = testingId === webhook.id

    return (
        <div className="bg-gray-900/50 border border-white/10 rounded-xl p-6 relative group">
            <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 bg-indigo-500/10 p-1 rounded-lg border border-indigo-500/20">
                    <select
                        value={selectedTestEvent || ''}
                        onChange={(e) => onSelectTestEvent(e.target.value)}
                        className="bg-transparent text-[10px] text-indigo-300 outline-none border-none cursor-pointer pr-1"
                    >
                        {webhook.events?.map((e: string) => (
                            <option key={e} value={e} className="bg-gray-900 text-white">
                                {eventTypes.find(t => t.id === e)?.label || e}
                            </option>
                        ))}
                    </select>
                    <div className="flex rounded-md overflow-hidden border border-indigo-500/20 bg-indigo-500/10">
                        {(['default', 'movie', 'tv'] as WebhookTestType[]).map((variant, i, arr) => (
                            <button
                                key={variant}
                                onClick={() => onTest(variant)}
                                disabled={isTesting}
                                className={`px-2 py-1 text-[10px] font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors disabled:opacity-50 ${i < arr.length - 1 ? 'border-r border-indigo-500/20' : ''}`}
                                title={variant === 'default' ? 'Test basique' : variant === 'movie' ? 'Test Film' : 'Test Série'}
                            >
                                {variant === 'default' ? 'Test' : variant === 'movie' ? 'Film' : 'Série'}
                            </button>
                        ))}
                    </div>
                </div>
                <button
                    onClick={onRemove}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Supprimer"
                >
                    <Trash2 size={16} />
                </button>
            </div>

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

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Type de service</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => onUpdate('type', 'discord')}
                                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${webhook.type === 'discord' ? 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'}`}
                            >
                                <MessageSquare size={16} /> Discord
                            </button>
                            <button
                                onClick={() => onUpdate('type', 'evolution')}
                                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${webhook.type === 'evolution' ? 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'}`}
                            >
                                <MessageSquare size={16} /> Evolution API
                            </button>
                            <button
                                onClick={() => onUpdate('type', 'custom')}
                                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${webhook.type === 'custom' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5'}`}
                            >
                                <WebhookIcon size={16} /> Webhook
                            </button>
                        </div>
                    </div>

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
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    URL de l&apos;API (ex: https://evo.tondomaine.com)
                                </label>
                                <input
                                    type="url"
                                    value={webhook.evolutionUrl || ''}
                                    onChange={(e) => onUpdate('evolutionUrl', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nom de l&apos;instance</label>
                                <input
                                    type="text"
                                    value={webhook.evolutionInstance || ''}
                                    onChange={(e) => onUpdate('evolutionInstance', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    placeholder="Ex: mediahub-bot"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Global API Key</label>
                                <input
                                    type="password"
                                    value={webhook.evolutionApiKey || ''}
                                    onChange={(e) => onUpdate('evolutionApiKey', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    placeholder="Votre clé API"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">
                                    Numéro WhatsApp destinataire (fallback)
                                </label>
                                <input
                                    type="text"
                                    value={webhook.whatsappNumber || ''}
                                    onChange={(e) => onUpdate('whatsappNumber', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    placeholder="Ex: 33612345678 (sans + ni espace)"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Utilisé si le destinataire fixe n&apos;a pas de numéro WhatsApp dans son profil.
                                </p>
                            </div>
                            <WebhookTemplatesList
                                webhook={webhook}
                                getDefaultTemplate={getDefaultEvolutionTemplate}
                                onUpdateTemplate={onUpdateTemplate}
                                onToggleImage={onToggleImage}
                                helpText={TEMPLATE_HELP_EVOLUTION}
                            />
                        </>
                    ) : webhook.type === 'discord' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">URL du Webhook Discord</label>
                                <input
                                    type="url"
                                    value={webhook.url || ''}
                                    onChange={(e) => onUpdate('url', e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    placeholder="https://discord.com/api/webhooks/..."
                                />
                            </div>
                            <WebhookTemplatesList
                                webhook={webhook}
                                getDefaultTemplate={getDefaultDiscordTemplate}
                                onUpdateTemplate={onUpdateTemplate}
                                onToggleImage={onToggleImage}
                                helpText={TEMPLATE_HELP_DISCORD}
                            />
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">URL du Webhook</label>
                            <input
                                type="url"
                                value={webhook.url || ''}
                                onChange={(e) => onUpdate('url', e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                placeholder="https://..."
                            />
                            {webhook.type === 'custom' && (
                                <p className="text-xs text-gray-500 mt-2">
                                    Le payload envoyé sera un JSON contenant: title, message, event, data
                                </p>
                            )}
                        </div>
                    )}

                    {testResult && testResult.id === webhook.id && (
                        <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${testResult.success ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {testResult.success ? (
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                            ) : (
                                <XCircle size={16} className="mt-0.5 shrink-0" />
                            )}
                            <span className="break-all">{testResult.message}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-gray-400 mb-3">Événements déclencheurs</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eventTypes.map(event => (
                        <label
                            key={event.id}
                            className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-black/20 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={(webhook.events || []).includes(event.id)}
                                onChange={() => onToggleEvent(event.id)}
                                className="w-4 h-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500/50 bg-black/40"
                            />
                            <span className="text-sm text-gray-300">{event.label}</span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    )
}
