'use client'

import { useEffect, useState } from 'react'
import { Play } from 'lucide-react'
import { SectionHeader, CheckboxField, InputField } from '../SharedComponents'
import type { SettingsFormData } from '../types'

interface OnyxSettingsProps {
  formData: SettingsFormData
  updateField: (field: keyof SettingsFormData, value: string | boolean | number | null | undefined) => void
  readOnly?: boolean
}

const BUTTON = 'rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50'
const FIELD = 'flex-1 rounded-xl border-white/10 bg-white/5 px-3 py-2 text-sm text-white'

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
    <div className="mt-6 space-y-4 rounded-xl border border-white/5 bg-black/20 p-4">
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
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 shadow-xl">
      <SectionHeader icon={Play} title="Onyx" description="Connexion à MediaHub avec un compte Onyx" />
      <div className="mb-6 space-y-4">
        <CheckboxField
          label="Activer l'authentification Onyx"
          checked={formData.auth_onyx_enabled}
          onChange={v => updateField('auth_onyx_enabled', v)}
          description="Permettre aux utilisateurs de se connecter avec leur compte Onyx (mot de passe, OTP ou code d'appairage)"
          readOnly={readOnly}
        />
        <CheckboxField
          label="Créer automatiquement les comptes"
          checked={formData.auth_onyx_auto_create}
          onChange={v => updateField('auth_onyx_auto_create', v)}
          description="Sinon, seuls les comptes MediaHub déjà liés à un compte Onyx peuvent se connecter. Le rôle par défaut s'applique aux nouveaux comptes."
          readOnly={readOnly}
        />
      </div>
      <InputField
        label="URL du serveur Onyx"
        value={formData.onyx_url}
        onChange={v => updateField('onyx_url', v)}
        placeholder="http://onyx:8080"
      />
      <OnyxLinkCard />
    </div>
  )
}
