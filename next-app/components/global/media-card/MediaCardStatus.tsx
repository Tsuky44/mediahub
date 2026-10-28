'use client'

import { formatReleaseDate } from '@/lib/release-date'

interface MediaCardStatusProps {
  status?: string
  message?: string
  releaseDate?: string
}

/**
 * Pastille de statut sur l'affiche : vert (disponible), demi-pastille jaune
 * (partiellement disponible), jaune qui pulse (en cours de traitement), blanc
 * (demandé mais pas encore sorti).
 */
const DOTS: Record<string, { className: string; label: string }> = {
  available: { className: 'bg-green-400', label: 'Disponible' },
  partial: {
    className: 'bg-[linear-gradient(90deg,var(--color-amber-400)_50%,var(--onyx-track)_50%)]',
    label: 'Partiellement disponible',
  },
  pending: { className: 'bg-amber-400 animate-pulse', label: 'En cours de traitement' },
  processing: { className: 'bg-amber-400 animate-pulse', label: 'En cours de traitement' },
  unreleased: { className: 'bg-onyx-ink', label: 'En attente de sortie' },
}

export function MediaCardStatus({ status, message, releaseDate }: MediaCardStatusProps) {
  const dot = status ? DOTS[status] : undefined
  if (!dot) return null

  const label = message || (status === 'unreleased' && releaseDate
    ? `${dot.label} · ${formatReleaseDate(releaseDate)}`
    : dot.label)

  return (
    <div
      role="img"
      aria-label={label}
      title={label}
      className={`absolute top-2 right-2 h-3 w-3 rounded-full ring-2 ring-black/50 ${dot.className} z-20`}
    />
  )
}
