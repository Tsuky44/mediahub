'use client'

import { useState } from 'react'
import { useSupportTickets } from './useSupportTickets'
import { RefreshCw, X, Copy, Clock, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import type { SupportTicketWithRelations } from '@/types/support'

const statusLabels: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
}

const statusColors: Record<string, string> = {
  open: 'bg-emerald-500/20 text-emerald-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-blue-500/20 text-blue-400',
  closed: 'bg-gray-500/20 text-gray-400',
}

export default function SupportTicketsList() {
  const { tickets, isLoading, refresh, updateStatus } = useSupportTickets()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  const [showClosed, setShowClosed] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const copyImageToClipboard = async (url: string) => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: copy url text
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const activeStatuses = ['open', 'in_progress']
  const closedStatuses = ['resolved', 'closed']

  const activeTickets = tickets.filter((t: SupportTicketWithRelations) => activeStatuses.includes(t.status))
  const closedTickets = tickets.filter((t: SupportTicketWithRelations) => closedStatuses.includes(t.status))

  const applyFilter = (list: SupportTicketWithRelations[]) =>
    filterStatus === 'all' ? list : list.filter((t: SupportTicketWithRelations) => t.status === filterStatus)

  const filteredActive = applyFilter(activeTickets)
  const filteredClosed = applyFilter(closedTickets)

  const renderTicket = (ticket: SupportTicketWithRelations) => (
    <div
      key={ticket.id}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
    >
      <button
        onClick={() =>
          setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)
        }
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 font-mono">
              #{ticket.id.slice(-8).toUpperCase()}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                statusColors[ticket.status]
              }`}
            >
              {statusLabels[ticket.status]}
            </span>
          </div>
          <div className="text-sm text-white/80 mt-1 truncate">
            {ticket.category.name}
            {ticket.subcategory ? ` › ${ticket.subcategory.name}` : ''}
          </div>
        </div>
        <div className="text-xs text-white/30">
          {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
        </div>
      </button>

      {expandedTicket === ticket.id && (
        <div className="border-t border-white/5 p-4 space-y-3">
          {ticket.user && (
            <div className="text-xs text-white/50">
              Par <span className="text-white/80">{ticket.user.name}</span>{' '}
              {ticket.user.email && `(${ticket.user.email})`}
            </div>
          )}
          {!ticket.user && ticket.userName && (
            <div className="text-xs text-white/50">
              Par <span className="text-white/80">{ticket.userName}</span>{' '}
              {ticket.userEmail && `(${ticket.userEmail})`}
            </div>
          )}

          <div className="bg-black/20 rounded-lg p-3 text-sm text-white/80 whitespace-pre-wrap">
            {ticket.message}
          </div>

          {(() => {
            const raw = ticket.attachments
            const urls: string[] = raw
              ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
              : []
            return urls.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-white/40">Pièces jointes :</div>
              <div className="flex gap-2 flex-wrap">
                {urls.map((url: string) => (
                  <button
                    key={url}
                    onClick={() => setPreviewImage(url)}
                    className="block"
                  >
                    <img
                      src={url}
                      alt="Pièce jointe"
                      className="h-20 w-20 object-cover rounded-lg border border-white/10 hover:border-indigo-500/50 transition-colors"
                    />
                  </button>
                ))}
              </div>
            </div>
            ) : null
          })()}

          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-white/40">Changer le statut :</span>
            {(['open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(ticket.id, s)}
                disabled={ticket.status === s}
                className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                  ticket.status === s
                    ? 'bg-white/10 text-white/60 cursor-default'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-white/40" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            <option value="all">Tous les statuts</option>
            <option value="open">Ouvert</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolu</option>
            <option value="closed">Fermé</option>
          </select>
        </div>
        <button
          onClick={refresh}
          className="text-white/40 hover:text-white transition-colors p-1"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center text-white/40 py-8">Chargement...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center text-white/40 py-8">Aucun ticket trouvé.</div>
      ) : (
        <div className="space-y-6">
          {/* Active Tickets */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
              <Clock size={14} />
              Tickets actifs ({filteredActive.length})
            </div>
            {filteredActive.length === 0 ? (
              <div className="text-sm text-white/30 py-2">Aucun ticket actif.</div>
            ) : (
              filteredActive.map(renderTicket)
            )}
          </div>

          {/* Closed Tickets — Collapsible */}
          {filteredClosed.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowClosed((v) => !v)}
                className="flex items-center gap-2 text-xs font-semibold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors"
              >
                {showClosed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Tickets fermés ({filteredClosed.length})
              </button>
              {showClosed && (
                <div className="space-y-3 opacity-60 hover:opacity-80 transition-opacity">
                  {filteredClosed.map(renderTicket)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={() => previewImage && copyImageToClipboard(previewImage)}
              className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors flex items-center gap-1.5"
              title="Copier l'image"
            >
              <Copy size={20} />
              {copied && <span className="text-xs font-medium pr-1">Copié !</span>}
            </button>
            <button
              onClick={() => setPreviewImage(null)}
              className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
              aria-label="Fermer"
            >
              <X size={24} />
            </button>
          </div>
          <img
            src={previewImage}
            alt="Aperçu"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
