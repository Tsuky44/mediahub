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
                'relative px-2 lg:px-4 py-2 text-sm font-medium transition-colors duration-300 ease-onyx rounded-full border flex items-center gap-2 group whitespace-nowrap',
                isActive
                  ? 'text-white bg-white/[0.08] border-white/15 shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]'
                  : 'text-gray-400 border-transparent hover:text-gray-100 hover:bg-white/5'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={clsx(
                  'w-4 h-4 transition-[scale] duration-300 ease-onyx',
                  isActive ? 'scale-110' : 'group-hover:scale-110'
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
