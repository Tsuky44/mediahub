'use client'

import { ArrowRight, Database, Globe } from 'lucide-react'
import Link from 'next/link'

export function QuickNavCards() {
  return (
    <div className="bg-gray-900/40 border border-gray-800/50 p-4 rounded-2xl backdrop-blur-sm flex flex-col justify-center space-y-3">
      <Link
        href="/dashboard/requests"
        className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-medium text-sm text-gray-200">Demandes</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
      </Link>

      <Link
        href="/dashboard/downloads"
        className="flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-xl transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 transition-colors">
            <Globe className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-medium text-sm text-gray-200">
            Téléchargements
          </span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
      </Link>
    </div>
  )
}
