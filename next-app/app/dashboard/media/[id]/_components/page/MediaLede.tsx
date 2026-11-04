'use client'

import { useEffect, useRef, useState } from 'react'

/** Résumé dans l'en-tête : 3 lignes, puis « Lire la suite » s'il est plus long */
export default function MediaLede({ overview }: { overview?: string }) {
  const text = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  const [clamped, setClamped] = useState(false)

  useEffect(() => {
    const el = text.current
    if (!el || open) return
    const observer = new ResizeObserver(() => setClamped(el.scrollHeight > el.clientHeight + 1))
    observer.observe(el)
    return () => observer.disconnect()
  }, [open])

  return (
    <div className="max-w-2xl">
      <p
        ref={text}
        className={`text-base leading-relaxed text-gray-200 [overflow-wrap:anywhere] [text-shadow:0_1px_8px_rgb(0_0_0/0.5)] ${open ? '' : 'line-clamp-3'}`}
      >
        {overview || 'Aucun synopsis disponible.'}
      </p>
      {(clamped || open) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1.5 text-sm font-semibold text-white underline decoration-white/35 underline-offset-4 transition-colors hover:decoration-white"
        >
          {open ? 'Réduire' : 'Lire la suite'}
        </button>
      )}
    </div>
  )
}
