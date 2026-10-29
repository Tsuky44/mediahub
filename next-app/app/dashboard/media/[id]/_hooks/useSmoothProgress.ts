'use client'

import { useEffect, useRef, useState } from 'react'

/** Constante de rattrapage (ms) : plus elle est courte, plus la barre corrige vite son écart. */
const CATCH_UP_MS = 1_000
/** On n'extrapole jamais plus loin que ce multiple de l'intervalle entre deux relevés. */
const MAX_AHEAD_INTERVALS = 1.5
const MIN_SAMPLE_GAP_MS = 200
const SETTLED_EPSILON = 0.005

interface Tracker {
  shown: number
  target: number
  sampleAt: number
  /** Vitesse estimée de la progression réelle, en % par ms. */
  rate: number
  interval: number
  lastFrame: number
  frame: number
}

/**
 * Lisse une progression relevée par à-coups (sondage toutes les 2 s) en suivant la
 * réalité au lieu de la rattraper en retard :
 * - la vitesse réelle est estimée à partir des deux derniers relevés ;
 * - la barre vise la position extrapolée (relevé + vitesse × temps écoulé) ;
 * - elle avance à la vitesse estimée, corrigée de l'écart restant : en retard elle
 *   accélère, en avance elle ralentit, sans jamais reculer ni sauter.
 * Un recul de la valeur réelle (nouveau téléchargement) est affiché tel quel.
 */
export function useSmoothProgress(target: number): number {
  const [value, setValue] = useState(target)
  const t = useRef<Tracker>({
    shown: target,
    target,
    sampleAt: 0,
    rate: 0,
    interval: 2_000,
    lastFrame: 0,
    frame: 0,
  })

  useEffect(() => {
    const s = t.current

    const tick = (now: number) => {
      const dt = Math.min(100, now - s.lastFrame)
      s.lastFrame = now

      // Plus de nouveau relevé depuis trop longtemps : le téléchargement est à l'arrêt.
      if (now - s.sampleAt > s.interval * MAX_AHEAD_INTERVALS) s.rate = 0

      const elapsed = Math.min(now - s.sampleAt, s.interval * MAX_AHEAD_INTERVALS)
      const desired = Math.min(100, s.target + s.rate * elapsed)
      const velocity = Math.max(0, s.rate + (desired - s.shown) / CATCH_UP_MS)
      s.shown = Math.min(100, Math.max(s.shown, s.shown + velocity * dt))
      setValue(s.shown)

      const settled = s.rate <= 0 && Math.abs(desired - s.shown) < SETTLED_EPSILON
      s.frame = settled ? 0 : requestAnimationFrame(tick)
    }

    const now = performance.now()

    if (s.sampleAt === 0 || target < s.shown) {
      // Premier relevé ou recul : pas d'animation, on repart de zéro.
      s.shown = s.target = target
      s.rate = 0
      s.sampleAt = now
      setValue(target)
      return
    }

    const gap = now - s.sampleAt
    if (gap >= MIN_SAMPLE_GAP_MS) {
      const instant = Math.max(0, (target - s.target) / gap)
      s.rate = s.rate === 0 ? instant : s.rate * 0.5 + instant * 0.5
      s.interval = Math.min(gap, 5_000)
    }
    s.target = target
    s.sampleAt = now

    s.lastFrame = now
    if (!s.frame) s.frame = requestAnimationFrame(tick)
  }, [target])

  useEffect(() => {
    const s = t.current
    return () => cancelAnimationFrame(s.frame)
  }, [])

  return value
}
