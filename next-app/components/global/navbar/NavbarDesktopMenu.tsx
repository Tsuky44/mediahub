'use client'

import Link from 'next/link'
import clsx from 'clsx'
import { useLayoutEffect, useRef, useState } from 'react'
import type { NavItem } from './_types/navbar'

interface NavbarDesktopMenuProps {
  items: NavItem[]
  pathname: string
}

/**
 * Menu principal : une pastille de verre glisse sous l'entrée survolée et revient
 * se poser sur la page courante. Elle est déplacée directement (sans rendu React).
 */
export function NavbarDesktopMenu({ items, pathname }: NavbarDesktopMenuProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const activeHref = items.find((item) => item.href === pathname)?.href ?? null
  const target = hovered ?? activeHref

  useLayoutEffect(() => {
    const list = listRef.current
    const pill = pillRef.current
    if (!list || !pill) return
    const place = () => {
      const link = target
        ? list.querySelector<HTMLElement>(`[data-href="${CSS.escape(target)}"]`)
        : null
      pill.style.opacity = link ? '1' : '0'
      if (!link) return
      pill.style.translate = `${link.offsetLeft}px 0`
      pill.style.width = `${link.offsetWidth}px`
    }
    place()
    // Largeurs recalculées quand la police finit de charger ou que la fenêtre change
    const observer = new ResizeObserver(place)
    observer.observe(list)
    return () => observer.disconnect()
  }, [target])

  return (
    <div className="hidden lg:flex flex-1 justify-center px-8">
      <div ref={listRef} className="relative flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
        <span
          ref={pillRef}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full border border-white/15 bg-white/[0.08] opacity-0 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] transition-[translate,width,opacity] duration-500 ease-out-onyx"
        />
        {items.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              data-href={item.href}
              onMouseEnter={() => setHovered(item.href)}
              onFocus={() => setHovered(item.href)}
              onBlur={() => setHovered(null)}
              className={clsx(
                'relative z-10 px-2 lg:px-4 py-2 text-sm font-medium transition-colors duration-300 ease-onyx rounded-full flex items-center gap-2 group whitespace-nowrap',
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-100'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={clsx(
                  'w-4 h-4 transition-[scale,rotate] duration-300 ease-spring',
                  isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:-rotate-6'
                )}
              />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
