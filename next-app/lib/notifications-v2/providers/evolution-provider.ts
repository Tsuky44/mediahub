/**
 * EvolutionProvider — implémentation MessageProvider pour Evolution API.
 *
 * SOLID notes:
 *  - SRP: ne fait que parler à Evolution (pas de logique métier, pas de templates).
 *  - LSP: interchangeable avec toute autre impl de MessageProvider.
 *  - Dependency Inversion: Listener dépend de MessageProvider, pas de cette classe.
 */

import axios, { AxiosError, AxiosInstance } from 'axios'
import type {
  EvolutionConfig,
  MessageProvider,
  RetryConfig,
  SendMessageRequest,
  SendMessageResult,
} from '../types'
import { withRetry } from './retry'

export class EvolutionProvider implements MessageProvider {
  readonly name = 'evolution'

  constructor(
    private readonly config: EvolutionConfig,
    private readonly retry: RetryConfig
  ) {}

  async send(req: SendMessageRequest): Promise<SendMessageResult> {
    if (!this.config.apiUrl || !this.config.apiKey || !this.config.instance) {
      return { success: false, attempts: 0, error: 'Evolution API not configured' }
    }
    if (!req.to) {
      return { success: false, attempts: 0, error: 'Missing recipient' }
    }

    const to = normalizeNumber(req.to)

    try {
      const { value: _, attempts } = await withRetry(
        () => this.dispatch(to, req),
        {
          maxAttempts: this.retry.maxAttempts,
          baseDelayMs: this.retry.baseDelayMs,
          maxDelayMs: this.retry.maxDelayMs,
          shouldRetry: (err) => isRetryable(err),
          onRetry: (err, attempt, delay) => {
            console.warn(
              `[NotificationsV2][Evolution] Retry ${attempt} in ${delay}ms:`,
              summarizeError(err)
            )
          },
        }
      )
      return { success: true, attempts }
    } catch (err) {
      return {
        success: false,
        attempts: this.retry.maxAttempts,
        error: summarizeError(err),
      }
    }
  }

  private client(): AxiosInstance {
    return axios.create({
      baseURL: this.config.apiUrl.replace(/\/$/, ''),
      headers: {
        'Content-Type': 'application/json',
        apikey: this.config.apiKey,
      },
      timeout: 15_000,
    })
  }

  private async dispatch(to: string, req: SendMessageRequest): Promise<void> {
    const http = this.client()
    const instance = encodeURIComponent(this.config.instance)

    if (req.mediaUrl) {
      await http.post(`/message/sendMedia/${instance}`, {
        number: to,
        mediatype: 'image',
        media: req.mediaUrl,
        caption: req.text,
      })
    } else {
      await http.post(`/message/sendText/${instance}`, {
        number: to,
        text: req.text,
      })
    }
  }
}

function normalizeNumber(n: string): string {
  return n.replace(/[^\d]/g, '')
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof AxiosError)) return true
  const status = err.response?.status
  if (!status) return true // network / timeout
  // Retry on 5xx and 429; don't retry on 4xx client errors.
  return status >= 500 || status === 429
}

function summarizeError(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status
    const data = err.response?.data
    
    // Détecter si l'instance Evolution API est déconnectée (Connection Closed)
    if (data && typeof data === 'object') {
      const dataObj = data as Record<string, any>
      const responseMsg = dataObj.response?.message
      const hasConnectionClosed = Array.isArray(responseMsg)
        ? responseMsg.some((m) => String(m).includes('Connection Closed'))
        : String(responseMsg ?? '').includes('Connection Closed')

      if (hasConnectionClosed || String(dataObj.error).includes('Connection Closed')) {
        return "L'instance WhatsApp d'Evolution API est déconnectée (Session fermée). Reconnectez votre téléphone ou scannez à nouveau le QR Code."
      }
    }

    return `HTTP ${status ?? '?'} ${err.code ?? ''} ${typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data ?? '')}`
  }
  return err instanceof Error ? err.message : String(err)
}
