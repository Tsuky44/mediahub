'use client'

import { useCallback, useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { SectionHeader, CheckboxField, InputField } from '../SharedComponents'
import type { SettingsFormData } from '../types'
import { api, ApiError } from '@/lib/api-client'

interface OnyxSettingsProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  readOnly?: boolean
}

/** Réponse de GET /api/admin/onyx */
interface OnyxStatus {
  url: string
  reachable: boolean
  version?: string | null
  error?: string
  apiKeySource: 'settings' | 'env' | null
  apiKeyHint: string | null
  webhookUrl: string
  webhookSource: 'settings' | 'env' | 'derived' | null
  fallbackEmail: string
  /** Réponse d'Onyx à la clé d'intégration (GET /api/integrations/mediahub/link) ; null sans clé */
  link: { ok: boolean; mediahubUrl?: string; error?: string } | null
}

const BUTTON = 'rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50'
const FIELD = 'flex-1 rounded-xl border-white/10 bg-white/5 px-3 py-2 text-sm text-white'
const CARD = 'space-y-4 rounded-xl border border-white/5 bg-black/20 p-4'

function randomKey() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** POST /api/admin/onyx : { ok, data } même en erreur, le message est dans data.error */
async function adminCall(body: Record<string, unknown>): Promise<{ ok: boolean; data: Record<string, any> }> {
  try {
    return { ok: true, data: await api.post<Record<string, any>>('/api/admin/onyx', body) }
  } catch (e) {
    if (e instanceof ApiError) return { ok: false, data: (e.data as Record<string, any>) ?? { error: e.message } }
    return { ok: false, data: { error: 'Impossible de contacter MediaHub' } }
  }
}

/** Lier le compte MediaHub courant a un compte Onyx (identifiants + OTP). */
function OnyxLinkCard() {
  const [linked, setLinked] = useState<boolean | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/user/onyx-link').then(r => r.json()).then(d => setLinked(!!d.linked)).catch(() => setLinked(null))
  }, [])

  const call = async (init: RequestInit) => {
    setBusy(true)
    setMessage('')
    try {
      const res = await fetch('/api/user/onyx-link', { headers: { 'Content-Type': 'application/json' }, ...init })
      const data = await res.json()
      if (!res.ok) { setMessage(data.error || 'Erreur'); return }
      if (data.otpRequired) { setChallenge(data.challenge); setCode(''); return }
      setLinked(!!data.linked)
      setChallenge(null)
      setPassword('')
      setMessage(data.linked ? `Compte lié à Onyx (${data.username ?? data.onyxUserId})` : 'Compte délié')
    } finally {
      setBusy(false)
    }
  }

  if (linked === null) return null

  return (
    <div className={CARD}>
      <p className="text-sm text-gray-300">
        Mon compte MediaHub : {linked ? 'lié à un compte Onyx' : "non lié à Onyx. Liez-le pour qu'Onyx et la connexion Onyx retrouvent ce compte."}
      </p>
      {linked ? (
        <button type="button" className={BUTTON} disabled={busy} onClick={() => call({ method: 'DELETE' })}>Délier</button>
      ) : challenge ? (
        <div className="flex gap-3">
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code de vérification Onyx" className={FIELD} />
          <button type="button" className={BUTTON} disabled={busy || !code} onClick={() => call({ method: 'POST', body: JSON.stringify({ challenge, code }) })}>Valider</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Identifiant Onyx" className={FIELD} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe Onyx" className={FIELD} />
          <button type="button" className={BUTTON} disabled={busy || !username || !password} onClick={() => call({ method: 'POST', body: JSON.stringify({ username, password }) })}>Lier</button>
        </div>
      )}
      {message && <p className="text-sm text-gray-400">{message}</p>}
    </div>
  )
}

export function OnyxSettings({ formData, updateField, readOnly }: OnyxSettingsProps) {
  const [status, setStatus] = useState<OnyxStatus | null>(null)
  const [busy, setBusy] = useState<'link' | 'rotate' | 'webhook' | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const refresh = useCallback(() => {
    api.get<OnyxStatus>('/api/admin/onyx', { cache: 'no-store' }).then(setStatus).catch(() => setStatus(null))
  }, [])
  useEffect(refresh, [refresh])

  const linkOnyx = async () => {
    setBusy('link')
    setMessage(null)
    try {
      const { ok, data } = await adminCall({ action: 'link-onyx', mediahubUrl: window.location.origin, apiKey: formData.player_integration_api_key })
      if (data.apiKey) updateField('player_integration_api_key', data.apiKey)
      if (!ok) {
        setMessage({
          ok: false,
          text: data.needsKeyInOnyx
            ? `Onyx ne connaît pas encore cette clé${data.generated ? ' (créée et enregistrée ici)' : ''} : copiez-la dans les réglages d'Onyx (MediaHub), puis recommencez.`
            : data.error || 'Erreur',
        })
        refresh()
        return
      }
      setMessage({ ok: true, text: `Onyx utilise maintenant ${window.location.origin}${data.generated ? ' et la clé créée' : ''}.` })
      refresh()
    } finally {
      setBusy(null)
    }
  }

  const rotateKey = async () => {
    setBusy('rotate')
    setMessage(null)
    try {
      const { ok, data } = await adminCall({ action: 'rotate-key' })
      if (!ok) { setMessage({ ok: false, text: data.error || 'Erreur' }); return }
      updateField('player_integration_api_key', data.apiKey)
      setMessage({ ok: true, text: "Nouvelle clé enregistrée dans Onyx et ici." })
      refresh()
    } finally {
      setBusy(null)
    }
  }

  const testWebhook = async () => {
    setBusy('webhook')
    setMessage(null)
    try {
      const { ok, data } = await adminCall({ action: 'test-webhook' })
      setMessage({ ok, text: ok ? data.message : data.error || 'Erreur' })
    } finally {
      setBusy(null)
    }
  }

  const derivedWebhook = formData.onyx_url ? `${formData.onyx_url.replace(/\/+$/, '')}/api/integrations/mediahub/events` : ''
  const link = status?.link

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader icon={Play} title="Onyx" description="Connexion, utilisateurs et bibliothèque d'un serveur Onyx" />

      <div className="mb-6 space-y-4">
        <InputField
          label="URL du serveur Onyx"
          value={formData.onyx_url}
          onChange={v => updateField('onyx_url', v)}
          placeholder="http://onyx:8080"
          readOnly={readOnly}
          description="Adresse joignable depuis le conteneur MediaHub (nom Docker ou IP locale)."
        />
        {status?.url && (
          <p className={`text-xs ${status.reachable ? 'text-emerald-300' : 'text-amber-300'}`}>
            {status.reachable ? `Onyx répond${status.version ? ` (version ${status.version})` : ''}.` : status.error}
          </p>
        )}
        <CheckboxField
          label="Activer l'authentification Onyx"
          checked={formData.auth_onyx_enabled}
          onChange={v => updateField('auth_onyx_enabled', v)}
          description="Permettre aux utilisateurs de se connecter avec leur compte Onyx (mot de passe, OTP, code d'appairage ou depuis l'app Onyx)"
          readOnly={readOnly}
        />
        <CheckboxField
          label="Créer automatiquement les comptes"
          checked={formData.auth_onyx_auto_create}
          onChange={v => updateField('auth_onyx_auto_create', v)}
          description="Sinon, seuls les comptes MediaHub déjà liés (ou importés par « Sync Onyx ») peuvent se connecter. Le rôle par défaut s'applique aux nouveaux comptes."
          readOnly={readOnly}
        />
      </div>

      <div className={CARD}>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white/90">Liaison avec l&apos;app Onyx</p>
          <p className="text-xs text-white/50">
            Une même clé sert aux deux sens : Onyx l&apos;utilise pour les demandes, la recherche et le SSO, MediaHub pour importer les
            comptes Onyx, lire sa bibliothèque et signer ses évènements. Aucun compte Onyx n&apos;est nécessaire. La première fois, copiez
            la clé dans les réglages d&apos;Onyx (MediaHub) ; ensuite, l&apos;adresse et les changements de clé passent par l&apos;API.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <InputField
              label="Clé d'intégration"
              type="password"
              value={formData.player_integration_api_key}
              onChange={v => updateField('player_integration_api_key', v)}
              placeholder={status?.apiKeySource === 'env' ? `Variable PLAYER_INTEGRATION_API_KEY (${status.apiKeyHint})` : 'Aucune clé'}
              readOnly={readOnly}
            />
          </div>
          {link?.ok ? (
            <button type="button" className={BUTTON} disabled={readOnly || busy !== null} onClick={rotateKey}>
              {busy === 'rotate' ? 'Changement…' : 'Changer la clé'}
            </button>
          ) : (
            <button type="button" className={BUTTON} disabled={readOnly} onClick={() => updateField('player_integration_api_key', randomKey())}>Générer</button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={BUTTON}
            disabled={readOnly || busy !== null || !formData.onyx_url}
            title={formData.onyx_url ? undefined : "Renseignez d'abord l'URL du serveur Onyx"}
            onClick={linkOnyx}
          >
            {busy === 'link' ? 'Configuration…' : 'Configurer Onyx automatiquement'}
          </button>
          {link && (
            <p className={`text-xs ${link.ok ? 'text-white/60' : 'text-amber-300'}`}>
              {link.ok
                ? `Côté Onyx : clé acceptée, ${link.mediahubUrl ? `MediaHub = ${link.mediahubUrl}` : 'adresse de MediaHub absente'}`
                : link.error}
            </p>
          )}
        </div>
        <InputField
          label="URL des évènements vers Onyx"
          value={formData.onyx_webhook_url}
          onChange={v => updateField('onyx_webhook_url', v)}
          placeholder={derivedWebhook || 'http://onyx:8080/api/integrations/mediahub/events'}
          readOnly={readOnly}
          description="Laissez vide pour la déduire de l'URL d'Onyx. Onyx y apprend les nouveaux imports et les changements de demandes."
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={BUTTON} disabled={busy !== null} onClick={testWebhook}>
            {busy === 'webhook' ? 'Envoi…' : "Tester l'envoi"}
          </button>
          <span className="text-xs text-white/40">Utilise les valeurs enregistrées.</span>
        </div>
        <InputField
          label="Compte MediaHub de repli (e-mail)"
          value={formData.player_integration_user_email}
          onChange={v => updateField('player_integration_user_email', v)}
          placeholder={status?.fallbackEmail || 'Facultatif'}
          readOnly={readOnly}
          description="Compte utilisé quand Onyx appelle sans dire pour quel utilisateur. Facultatif."
        />
        {message && <p className={`text-sm ${message.ok ? 'text-emerald-300' : 'text-amber-300'}`}>{message.text}</p>}
      </div>

      <div className="mt-6">
        <OnyxLinkCard />
      </div>
    </div>
  )
}
