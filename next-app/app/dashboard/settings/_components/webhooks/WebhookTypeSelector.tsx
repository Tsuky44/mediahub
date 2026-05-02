'use client'

import { MessageSquare, Webhook as WebhookIcon } from 'lucide-react'
import type { WebhookType } from '../../_types/webhook'

interface WebhookTypeSelectorProps {
  value: WebhookType
  onChange: (type: WebhookType) => void
}

const OPTIONS: { type: WebhookType; label: string; icon: typeof MessageSquare; activeClass: string; inactiveClass: string }[] = [
  {
    type: 'discord',
    label: 'Discord',
    icon: MessageSquare,
    activeClass: 'bg-[#5865F2]/20 border-[#5865F2] text-[#5865F2]',
    inactiveClass: 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5',
  },
  {
    type: 'evolution',
    label: 'Evolution API',
    icon: MessageSquare,
    activeClass: 'bg-[#25D366]/20 border-[#25D366] text-[#25D366]',
    inactiveClass: 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5',
  },
  {
    type: 'custom',
    label: 'Webhook',
    icon: WebhookIcon,
    activeClass: 'bg-emerald-500/20 border-emerald-500 text-emerald-500',
    inactiveClass: 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/5',
  },
]

export function WebhookTypeSelector({ value, onChange }: WebhookTypeSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map(({ type, label, icon: Icon, activeClass, inactiveClass }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors ${value === type ? activeClass : inactiveClass}`}
        >
          <Icon size={16} /> {label}
        </button>
      ))}
    </div>
  )
}
