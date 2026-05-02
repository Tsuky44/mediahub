'use client'

import { MessageSquare } from 'lucide-react'

export function SystemMessageHeader() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-3 bg-indigo-500/20 rounded-lg">
        <MessageSquare className="text-indigo-400" size={24} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white">Message Système (Pop-up)</h2>
        <p className="text-sm text-gray-400">
          Configurez un message qui s&apos;affichera pour tous les utilisateurs à leur prochaine connexion.
        </p>
      </div>
    </div>
  )
}
