'use client'

import { useCallback, useEffect, useState } from 'react'
import { getWebhooks, saveWebhooks, testWebhook } from '../webhook-actions'
import type { Webhook, WebhookTestResult, WebhookTestType, UserOption } from '../_types/webhook'

export interface UseWebhooksResult {
    webhooks: Webhook[]
    usersList: UserOption[]
    loading: boolean
    saving: boolean
    testingId: string | null
    testResult: WebhookTestResult | null
    selectedTestEvent: Record<string, string>
    setSelectedTestEvent: React.Dispatch<React.SetStateAction<Record<string, string>>>
    save: () => Promise<void>
    test: (index: number, testType?: WebhookTestType) => Promise<void>
    addWebhook: () => void
    removeWebhook: (index: number) => void
    updateWebhook: (index: number, field: string, value: any) => void
    toggleEvent: (index: number, event: string) => void
    updateTemplate: (index: number, eventId: string, value: string) => void
    toggleImage: (index: number, eventId: string) => void
}

function buildEmptyWebhook(): Webhook {
    return {
        id: Date.now().toString(),
        name: 'Nouveau Webhook',
        type: 'discord',
        url: '',
        events: ['media_request', 'account_request'],
        enabled: true,
    }
}

/**
 * Gere le chargement, l'edition et les tests des webhooks de notifications externes.
 */
export function useWebhooks(): UseWebhooksResult {
    const [webhooks, setWebhooks] = useState<Webhook[]>([])
    const [usersList, setUsersList] = useState<UserOption[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testingId, setTestingId] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<WebhookTestResult | null>(null)
    const [selectedTestEvent, setSelectedTestEvent] = useState<Record<string, string>>({})

    useEffect(() => {
        (async () => {
            try {
                const res = await getWebhooks()
                if (res.success) {
                    const loadedWebhooks: Webhook[] = res.webhooks || []
                    setWebhooks(loadedWebhooks)
                    const initialEvents: Record<string, string> = {}
                    loadedWebhooks.forEach(w => {
                        initialEvents[w.id] = w.events?.[0] || 'request_approved'
                    })
                    setSelectedTestEvent(initialEvents)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    useEffect(() => {
        fetch('/api/admin/users')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setUsersList(data)
            })
            .catch(console.error)
    }, [])

    const save = useCallback(async () => {
        setSaving(true)
        setTestResult(null)
        try {
            const res = await saveWebhooks(webhooks)
            if (res.success) alert('Configuration sauvegardée avec succès')
            else alert('Erreur lors de la sauvegarde: ' + res.error)
        } catch {
            alert('Erreur lors de la sauvegarde')
        } finally {
            setSaving(false)
        }
    }, [webhooks])

    const test = useCallback(async (index: number, testType: WebhookTestType = 'default') => {
        const webhook = webhooks[index]
        const eventType = selectedTestEvent[webhook.id] || 'request_approved'

        if (!webhook.url && webhook.type !== 'evolution') {
            alert('Veuillez renseigner une URL')
            return
        }
        if (webhook.type === 'evolution' && (!webhook.evolutionUrl || !webhook.evolutionInstance || !webhook.evolutionApiKey)) {
            alert("Veuillez renseigner l'URL, l'instance et la clé API pour Evolution API")
            return
        }

        setTestingId(webhook.id)
        setTestResult(null)

        try {
            const res = await testWebhook(webhook, testType, eventType)
            setTestResult({
                id: webhook.id,
                success: res.success,
                message: res.error || 'Test réussi !',
            })
        } catch (e: any) {
            setTestResult({
                id: webhook.id,
                success: false,
                message: e.message || 'Erreur lors du test',
            })
        } finally {
            setTestingId(null)
        }
    }, [webhooks, selectedTestEvent])

    const addWebhook = useCallback(() => {
        setWebhooks(prev => [...prev, buildEmptyWebhook()])
    }, [])

    const removeWebhook = useCallback((index: number) => {
        setWebhooks(prev => {
            const next = [...prev]
            next.splice(index, 1)
            return next
        })
    }, [])

    const updateWebhook = useCallback((index: number, field: string, value: any) => {
        setWebhooks(prev => {
            const next = [...prev]
            next[index] = { ...next[index], [field]: value }
            return next
        })
    }, [])

    const toggleEvent = useCallback((index: number, event: string) => {
        setWebhooks(prev => {
            const next = [...prev]
            const events = next[index].events || []
            next[index] = {
                ...next[index],
                events: events.includes(event)
                    ? events.filter(e => e !== event)
                    : [...events, event],
            }
            return next
        })
    }, [])

    const updateTemplate = useCallback((index: number, eventId: string, value: string) => {
        setWebhooks(prev => {
            const next = [...prev]
            const templates = { ...(next[index].templates || {}) }
            templates[eventId] = value
            next[index] = { ...next[index], templates }
            return next
        })
    }, [])

    const toggleImage = useCallback((index: number, eventId: string) => {
        setWebhooks(prev => {
            const next = [...prev]
            const includeImage = { ...(next[index].includeImage || {}) }
            const currentValue = includeImage[eventId] !== undefined ? includeImage[eventId] : true
            includeImage[eventId] = !currentValue
            next[index] = { ...next[index], includeImage }
            return next
        })
    }, [])

    return {
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
    }
}
