'use client'

import { ArrowRight, Database, Globe } from 'lucide-react'
import Link from 'next/link'
import { DASHBOARD_CARD } from './card-styles'

const LINKS = [
  { href: '/dashboard/requests', label: 'Demandes', Icon: Database },
  { href: '/dashboard/downloads', label: 'Téléchargements', Icon: Globe },
]

export function QuickNavCards() {
  return (
    <div className={`${DASHBOARD_CARD} flex flex-col justify-center gap-2`}>
      {LINKS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center justify-between px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors group"
        >
          <span className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            <span className="font-medium text-sm text-gray-200">{label}</span>
          </span>
          <ArrowRight className="onyx-nudge w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
        </Link>
      ))}
    </div>
  )
}
