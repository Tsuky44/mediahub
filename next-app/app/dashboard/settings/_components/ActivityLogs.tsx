'use client'

import { useState, useEffect } from 'react'
import { getActivityLogs, getLogUsers, importPastRequestsIntoLogs } from '../activity-actions'
import { Search, Filter, Loader2, ChevronLeft, ChevronRight, User as UserIcon, Activity, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [importing, setImporting] = useState(false)
  const limit = 50

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [page, filterAction, filterUser])

  const loadUsers = async () => {
    try {
      const data = await getLogUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users', error)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (filterAction) filters.action = filterAction
      if (filterUser) filters.userId = filterUser
      
      const data = await getActivityLogs(page, limit, filters)
      setLogs(data.logs)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load logs', error)
    } finally {
      setLoading(false)
    }
  }

  const parseDetails = (detailsStr: string | null) => {
    if (!detailsStr) return {}
    try {
      const parsed = JSON.parse(detailsStr)
      return parsed || {}
    } catch {
      return {}
    }
  }

  const getActionColor = (action: string) => {
    if (!action) return 'text-gray-400 bg-gray-400/10'
    if (action.includes('LOGIN')) return 'text-green-400 bg-green-400/10'
    if (action.includes('LOGOUT')) return 'text-orange-400 bg-orange-400/10'
    if (action.includes('REQUEST_APPROVE')) return 'text-emerald-400 bg-emerald-400/10'
    if (action.includes('REQUEST_REJECT')) return 'text-red-400 bg-red-400/10'
    if (action.includes('REQUEST_DELETE')) return 'text-rose-400 bg-rose-400/10'
    if (action.includes('REQUEST_CREATE')) return 'text-indigo-400 bg-indigo-400/10'
    if (action.includes('REQUEST')) return 'text-purple-400 bg-purple-400/10'
    if (action.includes('SEARCH')) return 'text-blue-400 bg-blue-400/10'
    if (action.includes('DELETE')) return 'text-red-400 bg-red-400/10'
    if (action.includes('SETTINGS')) return 'text-teal-400 bg-teal-400/10'
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-yellow-400 bg-yellow-400/10'
    if (action.includes('WATCH_LATER')) return 'text-pink-400 bg-pink-400/10'
    return 'text-gray-400 bg-gray-400/10'
  }

  const getActionLabel = (action: string) => {
    if (!action) return 'Inconnu'
    const labels: Record<string, string> = {
      'USER_LOGIN': 'Connexion',
      'USER_LOGOUT': 'Déconnexion',
      'MEDIA_REQUEST': 'Demande de média',
      'MEDIA_SEARCH': 'Recherche',
      'WATCH_LATER_ADD': 'Ajout À Regarder Plus Tard',
      'WATCH_LATER_REMOVE': 'Retrait À Regarder Plus Tard',
      'CREATE': 'Création',
      'UPDATE': 'Mise à jour',
      'DELETE': 'Suppression',
      'BULK_UPDATE': 'Mise à jour en masse',
      'BULK_DELETE': 'Suppression en masse',
      'ACCOUNT_REQUEST_CREATE': 'Demande de compte soumise',
      'ACCOUNT_REQUEST_APPROVE': 'Demande de compte approuvée',
      'ACCOUNT_REQUEST_REJECT': 'Demande de compte rejetée',
      'ACCOUNT_REQUEST_DELETE': 'Demande de compte supprimée',
      'UPDATE_SETTINGS': 'Mise à jour des paramètres système',
      'MEDIA_DELETE': 'Suppression de média',
      'REQUEST_DELETE': 'Suppression de demande',
      'DOCKER_ACTION': 'Action Docker',
      'SYNC_USERS': 'Synchronisation Utilisateurs',
    }
    return labels[action] || action
  }

  const formatDetails = (log: any, details: any) => {
    // Merge old format (in details) with new format (top-level)
    const entity = log.entity || details.entity
    const entityId = log.entityId || details.entityId
    
    const { ipAddress, userAgent, entity: dEntity, entityId: dEntityId, ...rest } = details
    
    const parts = []
    if (rest.query) parts.push(`Requête: "${rest.query}"`)
    if (rest.title) parts.push(`Titre: "${rest.title}"`)
    if (rest.mediaType) parts.push(`Type: ${rest.mediaType}`)
    if (rest.season) parts.push(`Saison: ${rest.season}`)
    if (rest.provider) parts.push(`Fournisseur: ${rest.provider}`)
    
    if (entity && entity !== 'System') parts.push(`Entité: ${entity}${entityId ? ` (${entityId})` : ''}`)
    
    // Fallback if no specific details mapped
    if (parts.length === 0 && Object.keys(rest).length > 0) {
      return JSON.stringify(rest)
    }
    
    return parts.join(' | ')
  }

  const totalPages = Math.ceil(total / limit)

  const handleImportPastRequests = async () => {
    try {
      setImporting(true)
      const res = await importPastRequestsIntoLogs()
      if (res.success) {
        alert(`Importation réussie. ${res.imported} anciennes demandes ont été ajoutées aux logs.`)
        loadLogs()
      } else {
        alert('Erreur lors de l\'importation: ' + res.error)
      }
    } catch (e) {
      console.error(e)
      alert('Erreur lors de l\'importation')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Journal d'activité</h2>
            <button
              onClick={handleImportPastRequests}
              disabled={importing}
              title="Importer l'historique des demandes dans les logs"
              className="p-1.5 rounded-md bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={importing ? "animate-spin" : ""} />
            </button>
          </div>
          <p className="text-sm text-gray-400">Historique complet des actions utilisateurs sur le serveur</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <select
              value={filterUser}
              onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
              className="w-full bg-gray-900/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 appearance-none"
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <UserIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>

          <div className="relative w-full sm:w-48">
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="w-full bg-gray-900/50 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 appearance-none"
            >
              <option value="">Toutes les actions</option>
              <option value="USER_LOGIN">Connexions</option>
              <option value="USER_LOGOUT">Déconnexions</option>
              <option value="MEDIA_REQUEST">Demandes de média</option>
              <option value="REQUEST_DELETE">Suppressions de demandes</option>
              <option value="MEDIA_SEARCH">Recherches</option>
              <option value="WATCH_LATER_ADD">Ajouts (À Regarder Plus Tard)</option>
              <option value="WATCH_LATER_REMOVE">Retraits (À Regarder Plus Tard)</option>
              <option value="ACCOUNT_REQUEST_CREATE">Nouvelles demandes de compte</option>
              <option value="UPDATE_SETTINGS">Mises à jour paramètres</option>
              <option value="MEDIA_DELETE">Suppressions médias</option>
              <option value="CREATE">Créations (Système)</option>
              <option value="UPDATE">Mises à jour (Système)</option>
              <option value="DELETE">Suppressions (Système)</option>
            </select>
            <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/40 text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Détails</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Chargement des logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Aucun log trouvé
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const details = parseDetails(log.details)
                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {log.user?.image ? (
                            <img src={log.user.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <UserIcon size={14} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white">{log.user?.name || 'Système'}</p>
                            {log.user?.email && <p className="text-xs text-gray-500">{log.user.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {formatDetails(log, details)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {log.ipAddress || details.ipAddress || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {format(new Date(log.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Affichage de {(page - 1) * limit + 1} à {Math.min(page * limit, total)} sur {total} entrées
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
