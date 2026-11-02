'use client'

import { useState } from 'react'
import { KeyRound, Copy, Check, RefreshCw } from 'lucide-react'
import { ArrSection } from './automation-settings/ArrSection'
import { SectionHeader } from './SharedComponents'
import { SettingsFormData } from './types'

interface Props {
    formData: SettingsFormData
    updateField: (field: keyof SettingsFormData, value: string) => void
    readOnly?: boolean
}

export const AutomationSettings = ({ formData, updateField, readOnly }: Props) => {
    const [copiedService, setCopiedService] = useState<string | null>(null)

    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008'

    const generateSecret = (field: 'webhook_sonarr_secret' | 'webhook_radarr_secret' | 'webhook_sorraa_secret' | 'webhook_emby_secret') => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        updateField(field, result)
    }

    const handleCopy = (text: string, service: string) => {
        navigator.clipboard.writeText(text)
        setCopiedService(service)
        setTimeout(() => setCopiedService(null), 2000)
    }

    const webhookServices = [
        {
            id: 'sonarr',
            name: 'Sonarr',
            description: 'Notifie MediaHub du lancement des téléchargements (Grab) et de la fin de l\'import des épisodes.',
            secretField: 'webhook_sonarr_secret' as const,
            endpoint: '/api/webhooks/sonarr',
        },
        {
            id: 'radarr',
            name: 'Radarr',
            description: 'Notifie MediaHub du lancement des téléchargements (Grab) et de l\'import des films.',
            secretField: 'webhook_radarr_secret' as const,
            endpoint: '/api/webhooks/radarr',
        },
        {
            id: 'sorraa',
            name: 'sorraa',
            description: 'Webhook signé (HMAC-SHA256) : états des demandes, téléchargements lancés et imports. Dans sorraa, déclarez ce webhook avec l\'URL ci-dessous et ce secret.',
            secretField: 'webhook_sorraa_secret' as const,
            endpoint: '/api/webhooks/sorraa',
            signed: true,
        },
    ]

    return (
        <div className="space-y-6">
            <ArrSection
                title="Radarr"
                description="Automatisation des films"
                urlField="radarr_url"
                keyField="radarr_api_key"
                formData={formData}
                updateField={updateField}
                placeholder="http://localhost:7878"
                readOnly={readOnly}
            />

            <ArrSection
                title="Sonarr"
                description="Automatisation des séries"
                urlField="sonarr_url"
                keyField="sonarr_api_key"
                formData={formData}
                updateField={updateField}
                placeholder="http://localhost:8989"
                readOnly={readOnly}
            />

            {/* Section Webhooks Entrants sécurisés */}
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
                <SectionHeader 
                    icon={KeyRound} 
                    title="Authentification des Webhooks Entrants" 
                    description="Génère des clés de sécurité pour authentifier les notifications envoyées par Sonarr et Radarr vers MediaHub." 
                />
                
                <div className="space-y-6">
                    {webhookServices.map((service) => {
                        const secret = formData[service.secretField] || ''
                        const fullUrl = secret 
                            ? `${origin}${service.endpoint}${'signed' in service ? '' : `?secret=${secret}`}`
                            : ''

                        return (
                            <div key={service.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-white">{service.name}</h3>
                                        <p className="text-xs text-white/50 leading-relaxed max-w-xl">
                                            {service.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => generateSecret(service.secretField)}
                                            disabled={readOnly}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 rounded-lg active:scale-95 disabled:opacity-50 transition-all"
                                        >
                                            <RefreshCw size={12} className="shrink-0" />
                                            {secret ? 'Régénérer' : 'Générer la clé'}
                                        </button>
                                    </div>
                                </div>

                                {secret ? (
                                    <div className="mt-3 space-y-1.5">
                                        {'signed' in service && (
                                            <div className="space-y-1.5 pb-2">
                                                <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
                                                    Secret de signature à saisir dans sorraa
                                                </label>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={secret}
                                                    className="block w-full rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-xs text-white/80 focus:outline-none focus:ring-0"
                                                />
                                            </div>
                                        )}
                                        <label className="text-[11px] font-semibold text-white/40 uppercase tracking-wider block">
                                            URL du webhook à copier
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={fullUrl}
                                                className="block flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:ring-0 disabled:opacity-50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(fullUrl, service.id)}
                                                className="flex items-center justify-center gap-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-semibold rounded-lg active:scale-95 transition-all shrink-0"
                                            >
                                                {copiedService === service.id ? (
                                                    <>
                                                        <Check size={14} className="text-emerald-400" />
                                                        <span className="text-emerald-400">Copié !</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={14} />
                                                        <span>Copier</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-xs text-amber-400/80 italic">
                                        ⚠️ Aucun secret généré. Veuillez cliquer sur &quot;Générer la clé&quot; puis sauvegarder les paramètres pour activer l&apos;authentification de ce webhook.
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

