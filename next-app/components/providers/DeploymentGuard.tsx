'use client'

import { useEffect } from 'react'

// Après une mise à jour de l'image, un onglet resté ouvert garde l'ancien JS :
// ses server actions n'existent plus côté serveur (« Failed to find Server Action »)
// et la page reste bloquée. Next signale ce cas par un en-tête sur la réponse :
// on recharge alors la page pour récupérer la nouvelle version.
const ACTION_NOT_FOUND_HEADER = 'x-nextjs-action-not-found'
const RELOAD_KEY = 'mediahub:deployment-reload'
// Garde-fou anti-boucle si le serveur répondait encore « introuvable » après rechargement
const MIN_RELOAD_INTERVAL_MS = 30_000

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < MIN_RELOAD_INTERVAL_MS) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return // sans stockage, impossible de garantir l'absence de boucle
  }
  window.location.reload()
}

export function DeploymentGuard() {
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args)
      if (res.headers.get(ACTION_NOT_FOUND_HEADER) === '1') reloadOnce()
      return res
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  return null
}
