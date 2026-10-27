'use client'

import { useEffect, useRef } from 'react'

const DURATION_MS = 900

/**
 * Nombre qui défile jusqu'à sa valeur la première fois qu'il apparaît à l'écran.
 * Accepte une valeur avec unité (« 30h », « 13G / 252G ») : seul le premier nombre
 * est animé. Un texte qui ne commence pas par un nombre (titre…) reste fixe.
 * Le texte final est rendu par React ; l'animation réécrit seulement le contenu
 * du même nœud texte, les mises à jour suivantes s'affichent sans animation.
 */
export function CountUp({ value, className }: { value: string | number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const played = useRef(false)
  const text = String(value)

  useEffect(() => {
    const el = ref.current
    const node = el?.firstChild
    const match = text.match(/^(\d+(?:[.,]\d+)?)([\s\S]{0,12})$/)
    if (played.current || !el || !node || node.nodeType !== Node.TEXT_NODE || !match) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const [, num, after] = match
    const target = parseFloat(num.replace(',', '.'))
    if (!target) return
    const decimals = (num.split(/[.,]/)[1] ?? '').length
    const separator = num.includes(',') ? ',' : '.'

    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      played.current = true
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS)
        const eased = 1 - Math.pow(1 - t, 4)
        node.nodeValue = (target * eased).toFixed(decimals).replace('.', separator) + after
        if (t < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    })
    observer.observe(el)
    // Si la valeur change en cours de route, React a déjà écrit le nouveau texte
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [text])

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  )
}
