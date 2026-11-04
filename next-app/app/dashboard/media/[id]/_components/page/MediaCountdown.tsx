'use client'

import { useSyncExternalStore } from 'react'
import { parseDay } from '../../_utils/media-labels'
import type { CountdownModel } from '../../_utils/media-countdown'

const pad = (n: number) => String(n).padStart(2, '0')
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const noop = () => () => {}
const daysBetween = (from: string, to: string) =>
  Math.round(((parseDay(to)?.getTime() ?? 0) - (parseDay(from)?.getTime() ?? 0)) / 86_400_000)
const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString('fr-FR', { timeZone: 'UTC', ...options })

interface MediaCountdownProps {
  model: CountdownModel
  /** Date du serveur (AAAA-MM-JJ) : remplacée par la date locale du navigateur dès l'affichage */
  today: string
}

/**
 * Compte à rebours de l'en-tête (« J-9 », la date, une barre qui se remplit jusqu'au jour J),
 * sans cadre, posé sur l'image de fond. Série terminée : « Fin » et la date du dernier épisode.
 */
export default function MediaCountdown({ model, today: serverToday }: MediaCountdownProps) {
  const today = useSyncExternalStore(noop, localToday, () => serverToday)
  const target = parseDay(model.target)
  if (!target) return null
  const left = daysBetween(today, model.target)
  if (model.kind !== 'last' && left < 0) return null

  const sameYear = target.getUTCFullYear() === parseDay(today)?.getUTCFullYear()
  const dayMonth = fmt(target, { day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) })
  let big: string
  let lines: [string, string]
  if (model.kind === 'last') {
    big = 'Fin'
    lines = ['diffusé le', fmt(target, { day: 'numeric', month: 'long', year: 'numeric' })]
  } else if (left === 0) {
    big = 'Jour J'
    lines = ["aujourd'hui", dayMonth]
  } else {
    big = `J-${left}`
    lines = [left === 1 ? 'demain' : fmt(target, { weekday: 'long' }), dayMonth]
  }

  // Barre : temps écoulé depuis l'épisode précédent (sinon sur les 60 derniers jours)
  let progress = 1
  if (model.kind !== 'last') {
    const span = model.from ? daysBetween(model.from, model.target) : 60
    progress = Math.min(1, Math.max(0.04, span > 0 ? 1 - left / span : 1))
  }

  return (
    <div className="onyx-countdown" data-kind={model.kind}>
      <span className="onyx-countdown-label">
        <span aria-hidden className="onyx-countdown-dot" />
        {model.label}
      </span>
      <div className="onyx-countdown-big">
        <b>{big}</b>
        <span>
          {lines[0]}
          <br />
          {lines[1]}
        </span>
      </div>
      <div aria-hidden className="onyx-countdown-bar">
        <i style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="onyx-countdown-caption">{model.caption}</span>
    </div>
  )
}
