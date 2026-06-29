'use client'

import { useState } from 'react'
import SupportCategoriesConfig from './SupportCategoriesConfig'
import SupportTicketsList from './SupportTicketsList'

type SubTab = 'categories' | 'tickets'

export default function SupportManagement() {
  const [subTab, setSubTab] = useState<SubTab>('categories')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Support & Tickets</h3>
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setSubTab('categories')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              subTab === 'categories'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Catégories
          </button>
          <button
            onClick={() => setSubTab('tickets')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              subTab === 'tickets'
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tickets
          </button>
        </div>
      </div>

      {subTab === 'categories' && <SupportCategoriesConfig />}
      {subTab === 'tickets' && <SupportTicketsList />}
    </div>
  )
}
