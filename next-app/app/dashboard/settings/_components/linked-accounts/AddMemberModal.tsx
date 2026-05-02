'use client'

import { X, Plus } from 'lucide-react'
import type { Candidate } from '../../_hooks/useLinkedAccounts'

interface AddMemberModalProps {
  groupName: string
  candidates: Candidate[]
  filteredCandidates: Candidate[]
  loading: boolean
  onClose: () => void
  onAdd: (candidate: Candidate) => void | Promise<void>
}

export function AddMemberModal({
  groupName,
  candidates,
  filteredCandidates,
  loading,
  onClose,
  onAdd,
}: AddMemberModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <h3 className="text-lg font-bold text-white">Ajouter un compte à &quot;{groupName}&quot;</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Chargement des comptes disponibles...</div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {candidates.length === 0 ? 'Aucun compte disponible à lier.' : 'Aucun compte trouvé avec ce filtre.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCandidates.map(candidate => (
                <button
                  key={candidate.userId}
                  onClick={() => onAdd(candidate)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-colors group text-left"
                >
                  <div>
                    <div className="text-white font-medium flex items-center gap-2">{candidate.username}</div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {candidate.source === 'logs' ? "Vu dans l'historique" : 'Utilisateur enregistré'}
                    </div>
                  </div>
                  <Plus size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
