import { readSettings } from '@/lib/settings'
import { normalizeOnyxUrl } from '@/lib/services/onyx-auth'

/**
 * Réglages de la liaison avec Onyx. Ils se règlent dans l'interface (onglet Media) ; les variables
 * d'environnement d'avant restent prises en secours, pour les installations déjà configurées.
 */

/** Route d'Onyx qui reçoit les évènements de MediaHub. */
export const ONYX_EVENTS_PATH = '/api/integrations/mediahub/events'

export type ValueSource = 'settings' | 'env' | 'derived' | null

export interface OnyxIntegrationConfig {
  /** Adresse du serveur Onyx joignable depuis MediaHub */
  url: string
  /** Clé d'intégration partagée (API du lecteur, rachat SSO, signature des évènements) */
  apiKey: string
  apiKeySource: ValueSource
  /** Compte MediaHub utilisé quand Onyx ne dit pas qui appelle */
  fallbackEmail: string
  /** URL qui reçoit les évènements ; à défaut, la route d'Onyx déduite de son adresse */
  webhookUrl: string
  webhookSource: ValueSource
}

const KEYS = ['onyx_url', 'player_integration_api_key', 'player_integration_user_email', 'onyx_webhook_url'] as const

function pick(setting: string, env: string | undefined): { value: string; source: ValueSource } {
  if (setting.trim()) return { value: setting.trim(), source: 'settings' }
  if (env?.trim()) return { value: env.trim(), source: 'env' }
  return { value: '', source: null }
}

export async function getOnyxIntegrationConfig(): Promise<OnyxIntegrationConfig> {
  const s = await readSettings(KEYS)
  const url = normalizeOnyxUrl(s.onyx_url)
  const key = pick(s.player_integration_api_key, process.env.PLAYER_INTEGRATION_API_KEY)
  const email = pick(s.player_integration_user_email, process.env.PLAYER_INTEGRATION_USER_EMAIL)
  let webhook = pick(s.onyx_webhook_url, process.env.ONYX_WEBHOOK_URL)
  if (!webhook.value && url) webhook = { value: `${url}${ONYX_EVENTS_PATH}`, source: 'derived' }
  return {
    url,
    apiKey: key.value,
    apiKeySource: key.source,
    fallbackEmail: email.value,
    webhookUrl: webhook.value,
    webhookSource: webhook.source,
  }
}

/** Clé d'intégration : réglage, sinon PLAYER_INTEGRATION_API_KEY. Vide si aucune. */
export async function getPlayerIntegrationKey(): Promise<string> {
  return (await getOnyxIntegrationConfig()).apiKey
}
