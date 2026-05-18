/**
 * Config Store — persists NotificationsV2 config in the `Setting` table.
 * Key isolation: `notifications_v2_config` (no collision with legacy).
 */

import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { NotificationsV2Config, NotificationEvent } from '../types'
import { ALL_EVENTS } from '../types'

export const CONFIG_KEY = 'notifications_v2_config'

const DEFAULT_CONFIG: NotificationsV2Config = {
  enabled: false,
  evolution: {
    apiUrl: '',
    apiKey: '',
    instance: '',
    defaultNumber: '',
  },
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
  },
  events: ALL_EVENTS.reduce((acc, ev) => {
    acc[ev] = {
      enabled: true,
      template: '',
      templateMovie: '',
      templateTv: '',
      targetUserIds: [],
      targetNumbers: [],
      notifyRequester: true,
      includePoster: true,
    }
    return acc
  }, {} as Record<NotificationEvent, any>),
}

function mergeWithDefaults(raw: any): NotificationsV2Config {
  const merged: NotificationsV2Config = {
    ...DEFAULT_CONFIG,
    ...raw,
    evolution: { ...DEFAULT_CONFIG.evolution, ...(raw?.evolution ?? {}) },
    retry: { ...DEFAULT_CONFIG.retry, ...(raw?.retry ?? {}) },
    events: { ...DEFAULT_CONFIG.events },
  }
  if (raw?.events) {
    for (const ev of ALL_EVENTS) {
      if (raw.events[ev]) {
        const evConfig = { ...DEFAULT_CONFIG.events[ev], ...raw.events[ev] }
        // Migration : ancien `template` → `templateMovie` pour rétrocompat
        if (evConfig.template && !evConfig.templateMovie) {
          evConfig.templateMovie = evConfig.template
        }
        merged.events[ev] = evConfig
      }
    }
  }
  return merged
}

export class ConfigStore {
  /** In-memory cache; invalidated on save. */
  private static cache: NotificationsV2Config | null = null
  private static cacheAt = 0
  private static readonly CACHE_TTL_MS = 30_000

  static async load(force = false): Promise<NotificationsV2Config> {
    const now = Date.now()
    if (!force && this.cache && now - this.cacheAt < this.CACHE_TTL_MS) {
      return this.cache
    }
    const row = await db.query.settings.findFirst({ where: eq(settings.key, CONFIG_KEY) })
    const raw = row?.value ? safeParse(row.value) : null
    const cfg = mergeWithDefaults(raw)
    this.cache = cfg
    this.cacheAt = now
    return cfg
  }

  static async save(cfg: NotificationsV2Config): Promise<void> {
    const value = JSON.stringify(cfg)
    const existing = await db.query.settings.findFirst({ where: eq(settings.key, CONFIG_KEY) })
    if (existing) {
      await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, CONFIG_KEY))
    } else {
      await db.insert(settings).values({
        key: CONFIG_KEY,
        value,
        category: 'notifications',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
    this.invalidate()
  }

  static invalidate(): void {
    this.cache = null
    this.cacheAt = 0
  }
}

function safeParse(v: string): any {
  try { return JSON.parse(v) } catch { return null }
}
