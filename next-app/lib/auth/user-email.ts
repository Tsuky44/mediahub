/**
 * Emails générés automatiquement quand le compte média (Emby/Jellyfin)
 * n'a pas d'adresse email configurée côté serveur.
 */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return (
    lower.endsWith('@local') ||
    lower.endsWith('@jellyfin.local') ||
    lower.endsWith('@emby.local')
  )
}

/**
 * Libellé court pour les comptes liés à un serveur média sans email réel.
 */
export function getMediaAccountLabel(email: string | null | undefined): string | null {
  if (!email) return null
  const lower = email.toLowerCase()
  if (lower.endsWith('@jellyfin.local')) return 'Compte Jellyfin'
  if (lower.endsWith('@local') || lower.endsWith('@emby.local')) return 'Compte Emby'
  return null
}

/**
 * Email affichable dans l'UI : masque les placeholders techniques.
 */
export function formatDisplayEmail(email: string | null | undefined): string | null {
  if (!email || isPlaceholderEmail(email)) return null
  return email
}

type EmbyEmailProfile = {
  Email?: string | null
  ConnectUserName?: string | null
}

/**
 * Résout l'email réel d'un utilisateur Emby.
 * AuthenticateByName ne renvoie souvent pas Email — le profil complet
 * ou ConnectUserName (compte lié Emby Connect) le contient.
 */
export function resolveEmbyUserEmail(profile: EmbyEmailProfile | null | undefined): string | null {
  if (!profile) return null

  for (const value of [profile.Email, profile.ConnectUserName]) {
    if (!value || typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed.includes('@') || isPlaceholderEmail(trimmed)) continue
    return trimmed.toLowerCase()
  }

  return null
}
