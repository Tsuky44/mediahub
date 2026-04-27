'use client'

import Link from 'next/link'
import clsx from 'clsx'
import type { NavItem } from './_types/navbar'

interface NavbarDesktopMenuProps {
  items: NavItem[]
  pathname: string
}

export function NavbarDesktopMenu({ items, pathname }: NavbarDesktopMenuProps) {
  return (
    <div className="hidden lg:flex flex-1 justify-center px-8">
      <div className="flex items-center gap-1">
        {items.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'relative px-2 lg:px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg flex items-center gap-2 group whitespace-nowrap',
                isActive
                  ? 'text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.15)] border border-indigo-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              <Icon
                className={clsx(
                  'w-4 h-4 transition-transform duration-300',
                  isActive ? 'scale-110' : 'group-hover:scale-110'
                )}
              />
              <span>{item.name}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-indigo-500/50 rounded-full blur-[2px]" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
