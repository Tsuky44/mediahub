/**
 * WebhookProvider — envoie les notifications via HTTP POST (logique identique à Overseerr).
 * Supporte le même système de KeyMap / template JSON / variables URL.
 */

import { logger } from '@/lib/logger'
import type { NotificationEventPayload, WebhookConfig } from '../types'

// ─────────────────────────────────────────────────────────────
// KeyMap (même mapping qu'Overseerr)
// ─────────────────────────────────────────────────────────────

type KeyMapFn = (payload: NotificationEventPayload) => string

const KeyMap: Record<string, string | KeyMapFn> = {
  notification_type: (p) => p.event,
  event: (p) => p.event,
  subject: (p) => p.media.title ?? '',
  message: (p) => p.media.overview ?? '',
  image: (p) => p.media.posterPath
    ? p.media.posterPath.startsWith('http')
      ? p.media.posterPath
      : `https://image.tmdb.org/t/p/w500${p.media.posterPath}`
    : '',
  media_type: (p) => p.media.mediaType,
  media_tmdbid: (p) => p.media.tmdbId ?? '',
  media_status: (p) => p.event,
  request_id: (p) => String(p.media.tmdbId ?? ''),
  requestedBy_username: (p) => p.requester?.name ?? '',
  requestedBy_email: (p) => p.requester?.email ?? '',
}

function getKeyValue(key: string, payload: NotificationEventPayload): string {
  const mapEntry = KeyMap[key]
  if (!mapEntry) return ''
  if (typeof mapEntry === 'function') return mapEntry(payload)
  // dot-path lookup
  const parts = mapEntry.split('.')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let val: any = payload
  for (const part of parts) {
    if (val == null) return ''
    val = val[part]
  }
  return val != null ? String(val) : ''
}

// ─────────────────────────────────────────────────────────────
// Template parsing (deep object walk, same as Overseerr)
// ─────────────────────────────────────────────────────────────

function parseKeys(
  obj: Record<string, unknown>,
  payload: NotificationEventPayload
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(obj)) {
    // Special block-key substitution ({{media}}, {{request}}, etc.)
    let resolvedKey = key
    if (key === '{{media}}') {
      resolvedKey = 'media'
    } else if (key === '{{request}}') {
      resolvedKey = 'request'
    } else if (key === '{{extra}}') {
      result['extra'] = []
      continue
    }

    if (typeof val === 'string') {
      let str = val
      for (const mapKey of Object.keys(KeyMap)) {
        str = str.replaceAll(`{{${mapKey}}}`, getKeyValue(mapKey, payload))
      }
      result[resolvedKey] = str
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      result[resolvedKey] = parseKeys(val as Record<string, unknown>, payload)
    } else {
      result[resolvedKey] = val
    }
  }

  return result
}

function buildPayload(
  jsonPayload: string,
  payload: NotificationEventPayload
): Record<string, unknown> {
  // jsonPayload is stored as a plain JSON string (not double-encoded like Overseerr's base64)
  const template = JSON.parse(jsonPayload) as Record<string, unknown>
  return parseKeys(template, payload)
}

function resolveUrl(
  webhookUrl: string,
  supportVariables: boolean,
  payload: NotificationEventPayload
): string {
  if (!supportVariables) return webhookUrl
  let url = webhookUrl
  for (const key of Object.keys(KeyMap)) {
    const value = getKeyValue(key, payload)
    url = url.replaceAll(`{{${key}}}`, encodeURIComponent(value))
  }
  return url
}

// ─────────────────────────────────────────────────────────────
// Default JSON payload template (same as Overseerr)
// ─────────────────────────────────────────────────────────────

export const DEFAULT_WEBHOOK_PAYLOAD = JSON.stringify({
  notification_type: '{{notification_type}}',
  event: '{{event}}',
  subject: '{{subject}}',
  message: '{{message}}',
  image: '{{image}}',
  '{{media}}': {
    media_type: '{{media_type}}',
    tmdbId: '{{media_tmdbid}}',
    status: '{{media_status}}',
  },
  '{{request}}': {
    request_id: '{{request_id}}',
    requestedBy_email: '{{requestedBy_email}}',
    requestedBy_username: '{{requestedBy_username}}',
  },
  '{{extra}}': [],
}, null, 2)

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export interface WebhookSendResult {
  success: boolean
  error?: string
}

export class WebhookProvider {
  constructor(private readonly config: WebhookConfig) {}

  shouldSend(): boolean {
    return this.config.enabled && !!this.config.webhookUrl
  }

  async send(payload: NotificationEventPayload): Promise<WebhookSendResult> {
    const { webhookUrl, jsonPayload, authHeader, customHeaders, supportVariables } = this.config

    if (!webhookUrl) {
      return { success: false, error: 'No webhook URL configured' }
    }

    const resolvedUrl = resolveUrl(webhookUrl, supportVariables ?? false, payload)

    let body: Record<string, unknown>
    try {
      body = buildPayload(jsonPayload || DEFAULT_WEBHOOK_PAYLOAD, payload)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.error(`[NotifV2][WebhookProvider] Failed to build payload: ${msg}`)
      return { success: false, error: `Invalid JSON payload: ${msg}` }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    if (customHeaders && customHeaders.length > 0) {
      for (const h of customHeaders) {
        const k = h.key?.trim()
        const v = h.value?.trim()
        if (k && v) {
          if (k.toLowerCase() !== 'authorization' || !authHeader) {
            headers[k] = v
          }
        }
      }
    }

    try {
      const res = await fetch(resolvedUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        logger.error(`[NotifV2][WebhookProvider] HTTP ${res.status}: ${text}`)
        return { success: false, error: `HTTP ${res.status}` }
      }

      logger.info(`[NotifV2][WebhookProvider] Sent → ${resolvedUrl} (${res.status})`)
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      logger.error(`[NotifV2][WebhookProvider] Fetch error: ${msg}`)
      return { success: false, error: msg }
    }
  }
}
