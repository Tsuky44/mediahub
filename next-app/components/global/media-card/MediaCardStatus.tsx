'use client'

interface MediaCardStatusProps {
  status?: string
  message?: string
}

/**
 * Point de statut sur l'affiche : sauge (disponible), encre à moitié pleine
 * (partiel), encre qui respire au rythme de la barre de l'app (en cours).
 */
export function MediaCardStatus({ status, message }: MediaCardStatusProps) {
  if (!status || status === 'not_available' || status === 'unknown') return null

  let colorClass = ''
  if (status === 'available') {
    colorClass = 'bg-green-400'
  } else if (status === 'partial') {
    colorClass = 'bg-[linear-gradient(90deg,var(--onyx-ink)_50%,var(--onyx-track)_50%)]'
  } else if (status === 'pending' || status === 'processing') {
    colorClass = 'bg-onyx-ink animate-pulse'
  } else {
    return null
  }

  return (
    <div
      className={`absolute top-2 right-2 h-3 w-3 rounded-full ring-2 ring-black/50 ${colorClass} z-20`}
      title={message}
    />
  )
}
