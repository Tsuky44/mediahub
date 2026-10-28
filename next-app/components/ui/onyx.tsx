'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** Timing de l'app : un état reste affiché au moins 1500 ms, une erreur 4000 ms. */
export const ONYX_MIN_STATE_MS = 1500
export const ONYX_ERROR_MS = 4000

export type OnyxPhase = 'idle' | 'sending' | 'done' | 'error'

export interface OnyxResult {
  ok: boolean
  message?: string
}

/**
 * Enchaîne les états d'une action (envoi, confirmation, erreur) au rythme de
 * l'app : pas d'état qui clignote, pas d'image vide entre deux états.
 */
export function useOnyxPhase() {
  const [phase, setPhase] = useState<OnyxPhase>('idle')
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimeout(timer.current)
    }
  }, [])

  const run = useCallback(async (send: () => Promise<OnyxResult>, onDone?: () => void) => {
    clearTimeout(timer.current)
    setError(null)
    setPhase('sending')
    const started = Date.now()
    let result: OnyxResult
    try {
      result = await send()
    } catch {
      result = { ok: false }
    }
    const rest = ONYX_MIN_STATE_MS - (Date.now() - started)
    if (rest > 0) await new Promise(resolve => setTimeout(resolve, rest))
    if (!alive.current) return result.ok

    if (result.ok) {
      setPhase('done')
      timer.current = setTimeout(() => {
        setPhase('idle')
        onDone?.()
      }, ONYX_MIN_STATE_MS)
    } else {
      setError(result.message || null)
      setPhase('error')
      timer.current = setTimeout(() => setPhase('idle'), ONYX_ERROR_MS)
    }
    return result.ok
  }, [])

  return { phase, error, run }
}

/** Barre indéterminée du splash : piste de 4 px, segment de 35 % en boucle de 1400 ms. */
export function OnyxTrack({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'amber' }) {
  return (
    <span
      aria-hidden
      className={cn('block h-1 overflow-hidden rounded-full bg-onyx-track', className)}
    >
      <span
        className={cn(
          'block h-full w-[35%] rounded-full animate-indeterminate',
          tone === 'amber' ? 'bg-amber-400' : 'bg-onyx-ink'
        )}
      />
    </span>
  )
}

/** Faisceau qui balaie une fois l'élément parent (qui doit être `relative overflow-hidden`). */
export function OnyxBeam() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-onyx-beam"
    />
  )
}
