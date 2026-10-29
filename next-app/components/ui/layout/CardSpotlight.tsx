'use client'

import { useEffect } from 'react'

/**
 * Feeds the cursor position to the `.mh-card` under the pointer, which draws
 * its hover glow there (see interface.css). One delegated listener for the
 * whole app; without it the glow simply stays at the top of the card.
 */
export function CardSpotlight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return

    const onPointerMove = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest<HTMLElement>('.mh-card')
      if (!card) return
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mh-spot-x', `${event.clientX - rect.left}px`)
      card.style.setProperty('--mh-spot-y', `${event.clientY - rect.top}px`)
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    return () => document.removeEventListener('pointermove', onPointerMove)
  }, [])

  return null
}
