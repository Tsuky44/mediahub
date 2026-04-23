'use client'

import { useState } from 'react'
import { Check, X, Loader2, UserPlus, Clock, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { approveAccountRequestAction, rejectAccountRequestAction, deleteAccountRequestAction } from '../actions'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AccountRequest {
  id: string
  email: string
  firstName: string
  inviter: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: Date
  updatedAt: Date
}

interface AccountRequestsManagementProps {
  requests: AccountRequest[]
  users?: any[] // Added users prop for template selection
}

export default function AccountRequestsManagement({ requests: initialRequests, users = [] }: AccountRequestsManagementProps) {
  const [requests, setRequests] = useState<AccountRequest[]>(initialRequests)
  const [processingId, setProcessingId] = useState<string | null>(null)
  
  // State for approval modal
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null)
  const [templateUserId, setTemplateUserId] = useState<string>('')
  const [customName, setCustomName] = useState<string>('')

  // Filter users that have an Emby ID to use as templates
  const templateUsers = users.filter(u => u.embyUserId)

  const handleApproveClick = (request: AccountRequest) => {
    setSelectedRequest(request)
    setTemplateUserId('') // Reset selection
    setCustomName(request.firstName) // Initialize with request name
  }

  const handleConfirmApprove = async () => {
    if (!selectedRequest) return

    setProcessingId(selectedRequest.id)
    try {
      const result = await approveAccountRequestAction(selectedRequest.id, templateUserId || undefined, customName)
      if (result.success) {
        toast.success(result.message)
        setRequests(prev => prev.map(req => 
          req.id === selectedRequest.id ? { ...req, status: 'APPROVED' } : req
        ))
        setSelectedRequest(null)
      } else {
        toast.error(result.message || "Une erreur est survenue")
      }
    } catch (error) {
      toast.error("Erreur de communication avec le serveur")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      const result = await rejectAccountRequestAction(requestId)
      if (result.success) {
        toast.success(result.message)
        // Update local state to reflect change
        setRequests(prev => prev.map(req => 
          req.id === requestId ? { ...req, status: 'REJECTED' } : req
        ))
      } else {
        toast.error(result.message || "Une erreur est survenue")
      }
    } catch (error) {
      toast.error("Erreur de communication avec le serveur")
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (requestId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return

    setProcessingId(requestId)
    try {
      const result = await deleteAccountRequestAction(requestId)
      if (result.success) {
        toast.success(result.message)
        setRequests(prev => prev.filter(req => req.id !== requestId))
      } else {
        toast.error(result.message || "Une erreur est survenue")
      }
    } catch (error) {
      toast.error("Erreur de communication avec le serveur")
    } finally {
      setProcessingId(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING')
  const historyRequests = requests.filter(r => r.status !== 'PENDING').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return (
    <div className="space-y-8">
      {/* En attente */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="text-yellow-500" />
          Demandes en attente
          <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded-full">
            {pendingRequests.length}
          </span>
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="text-gray-400 italic p-4 border border-white/5 rounded-lg bg-white/5 text-center">
            Aucune demande en attente.
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingRequests.map(request => (
              <div key={request.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col md:flex-row justify-between gap-4 transition-all hover:border-white/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-white">
                      {request.firstName}
                    </span>
                    <span className="text-sm text-gray-400 bg-black/30 px-2 py-0.5 rounded">
                      {request.email}
                    </span>
                  </div>
                  
                  {request.inviter && (
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5 text-gray-300 text-sm italic">
                      Invité par: <span className="text-indigo-400 font-medium">{request.inviter}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Demandé {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: fr })}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === request.id ? <Loader2 className="animate-spin" size={20} /> : <X size={20} />}
                    Refuser
                  </button>
                  <button
                    onClick={() => handleDelete(request.id)}
                    disabled={processingId === request.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-500/10 hover:bg-red-500/20 text-gray-500 hover:text-red-500 border border-gray-500/20 hover:border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Supprimer la demande"
                  >
                    {processingId === request.id ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  </button>
                  <button
                    onClick={() => handleApproveClick(request)}
                    disabled={processingId === request.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === request.id ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    Approuver
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1b26] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">Approuver la demande</h3>
            
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <p className="text-sm text-gray-400">Demandeur :</p>
                <p className="text-lg font-semibold text-white">{selectedRequest.firstName}</p>
                <p className="text-sm text-gray-400">{selectedRequest.email}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Nom d'utilisateur Emby
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Nom du compte Emby"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Copier les permissions depuis (Optionnel)
                </label>
                <select
                  value={templateUserId}
                  onChange={(e) => setTemplateUserId(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Aucun (Permissions par défaut) --</option>
                  {templateUsers.map(user => (
                    <option key={user.id} value={user.embyUserId || ''}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">
                  Si sélectionné, le nouvel utilisateur aura les mêmes accès et restrictions que l'utilisateur choisi.
                  De plus, le compte sera automatiquement lié à Emby Connect.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={!!processingId}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {processingId ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      <div className="space-y-4 pt-8 border-t border-white/10">
        <h3 className="text-xl font-bold text-gray-400 flex items-center gap-2">
          Historique récent
        </h3>

        <div className="space-y-2">
          {historyRequests.slice(0, 10).map(request => (
            <div key={request.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 items-center">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${request.status === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{request.firstName}</span>
                    <span className="text-sm text-gray-400">({request.email})</span>
                  </div>
                  <div className="text-xs text-gray-500 flex gap-2">
                    <span>Traité {formatDistanceToNow(new Date(request.updatedAt), { addSuffix: true, locale: fr })}</span>
                    {request.inviter && <span>• Invité par {request.inviter}</span>}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  request.status === 'APPROVED' 
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {request.status === 'APPROVED' ? 'APPROUVÉ' : 'REJETÉ'}
                </span>
                
                <button
                  onClick={() => handleDelete(request.id)}
                  disabled={processingId === request.id}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  title="Supprimer définitivement"
                >
                   {processingId === request.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
          
          {historyRequests.length === 0 && (
            <div className="text-gray-500 italic text-sm">Aucun historique récent.</div>
          )}
        </div>
      </div>
    </div>
  )
}
