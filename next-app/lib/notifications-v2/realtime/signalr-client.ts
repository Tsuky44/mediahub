/**
 * SignalRClient — connects to a Radarr or Sonarr SignalR hub and invokes
 * a callback on every server-pushed message.
 *
 * Used purely as a "something changed" trigger — we don't parse payloads;
 * downstream code re-queries the source of truth.
 */

import * as signalR from '@microsoft/signalr'
// Force Next.js standalone to include ws in the server bundle.
// @microsoft/signalr imports it transitively and Next.js tracing misses it.
import 'ws'

export interface SignalRMessage {
  name?: string
  body?: unknown
  action?: string
}

export type OnMessage = (msg: SignalRMessage, source: 'radarr' | 'sonarr') => void

export class SignalRClient {
  private connection: signalR.HubConnection | null = null
  private retryCount = 0

  constructor(
    private readonly source: 'radarr' | 'sonarr',
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly onMessage: OnMessage
  ) {}

  async start(): Promise<void> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/signalr/messages?access_token=${encodeURIComponent(
      this.apiKey
    )}`

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, {
        // Use LongPolling only — WebSocket requires 'ws' which is not bundled
        // by Next.js standalone for transitive deps. LongPolling works fine for
        // sporadic server-pushed events (queue/movie updates).
        transport: signalR.HttpTransportType.LongPolling,
        skipNegotiation: false,
      })
      .withAutomaticReconnect({
        // Custom retry policy: aggressive at first, then back off.
        nextRetryDelayInMilliseconds: () => {
          this.retryCount++
          if (this.retryCount <= 3) return 2_000
          if (this.retryCount <= 10) return 10_000
          return 30_000
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    this.connection.on('receiveMessage', (msg: SignalRMessage) => {
      try {
        this.onMessage(msg, this.source)
      } catch (err) {
        console.error(`[NotificationsV2][SignalR][${this.source}] onMessage error:`, err)
      }
    })

    this.connection.onreconnected(() => {
      this.retryCount = 0
      console.log(`[NotificationsV2][SignalR][${this.source}] Reconnected`)
    })

    this.connection.onclose((err) => {
      if (err) {
        console.error(`[NotificationsV2][SignalR][${this.source}] Connection closed:`, err.message)
      }
    })

    try {
      await this.connection.start()
      this.retryCount = 0
      console.log(`[NotificationsV2][SignalR][${this.source}] Connected to ${this.baseUrl}`)
    } catch (err) {
      console.error(
        `[NotificationsV2][SignalR][${this.source}] Initial connection failed:`,
        (err as Error).message
      )
      // Schedule a manual retry — automaticReconnect doesn't fire on initial failure.
      setTimeout(() => this.start().catch(() => {}), 10_000)
    }
  }

  async stop(): Promise<void> {
    if (this.connection) {
      try { await this.connection.stop() } catch {}
      this.connection = null
    }
  }
}
