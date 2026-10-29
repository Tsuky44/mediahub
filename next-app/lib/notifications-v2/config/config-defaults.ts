/**
 * config-defaults.ts
 *
 * Valeurs par defaut et normalisation de la config NotificationsV2.
 *
 * Volontairement SANS acces base : ces fonctions sont pures, ce qui les rend
 * testables a l'unite (`config-defaults.test.ts`). La persistance vit dans
 * `config-store.ts`.
 */

import type { NotificationsV2Config, NotificationEvent } from '../types'
import { ALL_EVENTS } from '../types'

export const DEFAULT_CONFIG: NotificationsV2Config = {
  enabled: false,
  useDownloadIntent: true,
  evolution: {
    apiUrl: '',
    apiKey: '',
    instance: '',
    defaultNumber: '',
  },
  webpush: {
    enabled: false,
    liveCard: true,
    requesterLiveCard: true,
  },
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 15000,
  },
  events: ALL_EVENTS.reduce((acc, ev) => {
    acc[ev] = {
      enabled: ev !== 'EPISODE_AVAILABLE', // Désactivé par défaut pour EPISODE_AVAILABLE afin d'éviter le spam
      // Pas de `template` ici : le champ legacy n'existe plus que dans les
      // configs déjà en base, le temps que la migration le résorbe.
      templateMovie: '',
      templateTv: '',
      targetUserIds: [],
      targetNumbers: [],
      notifyRequester: true,
      includePoster: true,
      // Web Push en opt-in explicite : une config existante en base ne route
      // rien vers les appareils tant que l'admin ne l'a pas coché event par event.
      webpushEnabled: false,
      webpushTargetUserIds: [],
      webpushNotifyRequester: false,
    }
    return acc
  }, {} as Record<NotificationEvent, any>),
  webhook: {
    enabled: false,
    webhookUrl: '',
    jsonPayload: '',
    authHeader: '',
    customHeaders: [],
    supportVariables: false,
    types: 0,
  },
}

/**
 * Copie profonde des défauts d'un event.
 *
 * Indispensable : `DEFAULT_CONFIG.events[ev]` contient des tableaux
 * (`targetUserIds`, `targetNumbers`, `webpushTargetUserIds`). Un spread
 * superficiel les partagerait par référence entre tous les chargements, si bien
 * qu'une mutation en place sur une config contaminerait le défaut du process.
 */
function defaultRoute(ev: NotificationEvent) {
  const d = DEFAULT_CONFIG.events[ev]
  return {
    ...d,
    targetUserIds: [...(d.targetUserIds ?? [])],
    targetNumbers: [...(d.targetNumbers ?? [])],
    webpushTargetUserIds: [...(d.webpushTargetUserIds ?? [])],
  }
}

/**
 * Migre le champ historique `template` vers `templateMovie`/`templateTv`, puis
 * le SUPPRIME.
 *
 * La suppression n'est pas cosmétique. Tant que `template` survit en base, la
 * migration se redéclenche à chaque `load()` : l'admin vide `templateMovie`
 * dans l'interface, la sauvegarde enregistre bien une chaîne vide, mais le
 * chargement suivant réinjecte l'ancienne valeur depuis `template`. Le template
 * personnalisé devient impossible à effacer.
 *
 * Retourne `true` si le champ legacy était présent — donc si la config en base
 * diffère désormais de la config normalisée et mérite d'être réécrite.
 */
function migrateLegacyTemplate(route: Record<string, any>): boolean {
  if (!('template' in route)) return false

  const legacy = typeof route.template === 'string' ? route.template.trim() : ''

  if (legacy.length > 0) {
    // Le legacy était unique pour les deux types de média : on le recopie dans
    // les deux variantes, mais uniquement là où rien n'a été personnalisé.
    if (!route.templateMovie || String(route.templateMovie).trim().length === 0) {
      route.templateMovie = legacy
    }
    if (!route.templateTv || String(route.templateTv).trim().length === 0) {
      route.templateTv = legacy
    }
  }

  delete route.template
  return true
}

export function mergeWithDefaults(raw: any): { config: NotificationsV2Config; migrated: boolean } {
  const merged: NotificationsV2Config = {
    ...DEFAULT_CONFIG,
    ...raw,
    evolution: { ...DEFAULT_CONFIG.evolution, ...(raw?.evolution ?? {}) },
    webpush: { ...DEFAULT_CONFIG.webpush, ...(raw?.webpush ?? {}) },
    retry: { ...DEFAULT_CONFIG.retry, ...(raw?.retry ?? {}) },
    events: {} as NotificationsV2Config['events'],
    webhook: { ...DEFAULT_CONFIG.webhook, ...(raw?.webhook ?? {}) },
  }

  let migrated = false
  for (const ev of ALL_EVENTS) {
    const route = { ...defaultRoute(ev), ...(raw?.events?.[ev] ?? {}) }
    if (migrateLegacyTemplate(route)) migrated = true
    merged.events[ev] = route
  }

  return { config: merged, migrated }
}
