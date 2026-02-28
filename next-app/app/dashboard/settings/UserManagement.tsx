'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface User {
  id: number
  name: string | null
  email: string | null
  image: string | null
  role: string
  roleId: string | null
  roleRef: { name: string } | null
  embyUserId: string | null
  plexUserId: string | null
  jellyfinUserId: string | null
}

interface UserManagementProps {
  initialUsers: User[]
  roles: { id: string, name: string }[]
  readOnly?: boolean
}

export default function UserManagement({ initialUsers, roles, readOnly = false }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [filterProvider, setFilterProvider] = useState<string>('all')
  const [bulkRole, setBulkRole] = useState<string>('')

  // Filter users based on selected provider
  const filteredUsers = users.filter(user => {
    if (filterProvider === 'all') return true
    if (filterProvider === 'emby') return !!user.embyUserId
    if (filterProvider === 'plex') return !!user.plexUserId
    if (filterProvider === 'jellyfin') return !!user.jellyfinUserId
    if (filterProvider === 'local') return !user.embyUserId && !user.plexUserId && !user.jellyfinUserId
    return true
  })

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(filteredUsers.map(u => u.id))
    } else {
      setSelectedUserIds([])
    }
  }

  const handleSelectUser = (userId: number) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Bulk update handler
  const handleBulkUpdate = async () => {
    if (selectedUserIds.length === 0 || !bulkRole) return

    if (!confirm(`Voulez-vous vraiment changer le rôle de ${selectedUserIds.length} utilisateurs ?`)) return

    try {
      const payload: any = { userIds: selectedUserIds }
      
      if (bulkRole === 'none') {
        payload.role = 'user'
        payload.roleId = null
      } else {
        payload.role = 'user'
        payload.roleId = bulkRole
      }

      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Bulk update failed')

      const data = await response.json()
      toast.success(`${data.count} utilisateurs mis à jour`)
      
      // Refresh users
      const usersRes = await fetch('/api/admin/users')
      if (usersRes.ok) {
        setUsers(await usersRes.json())
      }
      setSelectedUserIds([])
      setBulkRole('')
    } catch (e) {
      console.error(e)
      toast.error('Erreur lors de la mise à jour de masse')
    }
  }

  const handleRoleUpdate = async (userId: number, value: string) => {
    setUpdatingId(userId)
    
    try {
      const payload: any = { id: userId }
      
      if (value === 'admin') {
        payload.role = 'admin'
        payload.roleId = null
      } else if (value === '') {
        payload.role = 'user'
        payload.roleId = null
      } else {
        payload.role = 'user' // Default to user when assigning a custom role
        payload.roleId = value
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error('Failed to update user')

      const updatedUser = await response.json()
      setUsers(users.map(u => u.id === userId ? updatedUser : u))
      toast.success('Rôle mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdatingId(null)
    }
  }

  const [syncingProvider, setSyncingProvider] = useState<string | null>(null)

  const handleSync = async (provider: string) => {
    setSyncingProvider(provider)
    try {
        const response = await fetch('/api/admin/users/sync', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider })
        })
        if (!response.ok) throw new Error('Sync failed')
        const data = await response.json()
        
        if (data.details && data.details.length > 0) {
            toast(`Sync terminée avec avertissements: ${data.details.length} erreurs`, { icon: '⚠️' })
            console.warn('Sync details:', data.details)
        }
        
        toast.success(`${data.created} utilisateurs ajoutés, ${data.updated} mis à jour, ${data.deleted} supprimés`)
        
        // Reload users
        const usersRes = await fetch('/api/admin/users')
        if (usersRes.ok) {
            setUsers(await usersRes.json())
        }
    } catch (e) {
        toast.error('Erreur lors de la synchronisation')
        console.error(e)
    } finally {
        setSyncingProvider(null)
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      <div className="flex flex-col gap-4 p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Gestion des utilisateurs</h3>
            <div className="flex gap-2">
                <button
                    onClick={() => handleSync('emby')}
                    disabled={!!syncingProvider || readOnly}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {syncingProvider === 'emby' ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span>Sync Emby</span>
                    )}
                </button>
                <button
                    onClick={() => handleSync('plex')}
                    disabled={!!syncingProvider || readOnly}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {syncingProvider === 'plex' ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span>Sync Plex</span>
                    )}
                </button>
                <button
                    onClick={() => handleSync('jellyfin')}
                    disabled={!!syncingProvider || readOnly}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                    {syncingProvider === 'jellyfin' ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span>Sync Jellyfin</span>
                    )}
                </button>
            </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 bg-black/20 p-1 rounded-lg">
                {[
                    { id: 'all', label: 'Tous' },
                    { id: 'emby', label: 'Emby' },
                    { id: 'plex', label: 'Plex' },
                    { id: 'jellyfin', label: 'Jellyfin' },
                    { id: 'local', label: 'Local' }
                ].map(provider => (
                    <button
                        key={provider.id}
                        onClick={() => setFilterProvider(provider.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            filterProvider === provider.id 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {provider.label}
                    </button>
                ))}
            </div>

            {selectedUserIds.length > 0 && !readOnly && (
                <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-right-4">
                    <span className="text-sm text-indigo-200 font-medium">
                        {selectedUserIds.length} sélectionné(s)
                    </span>
                    <div className="h-4 w-px bg-indigo-500/20" />
                    <select
                        value={bulkRole}
                        onChange={(e) => setBulkRole(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">Choisir un rôle...</option>
                        <option value="none">Aucun rôle</option>
                        {roles.length > 0 && (
                            <optgroup label="Rôles personnalisés">
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    <button
                        onClick={handleBulkUpdate}
                        disabled={!bulkRole}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Appliquer
                    </button>
                    <div className="h-4 w-px bg-indigo-500/20 mx-1" />
                    <button
                        onClick={async () => {
                            if (selectedUserIds.length === 0) return
                            if (!confirm(`Voulez-vous vraiment supprimer ces ${selectedUserIds.length} utilisateurs ?`)) return
                            
                            try {
                                const response = await fetch('/api/admin/users/bulk', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userIds: selectedUserIds, action: 'delete' })
                                })
                                
                                if (!response.ok) {
                                    const data = await response.json()
                                    throw new Error(data.error || 'Delete failed')
                                }
                                
                                const data = await response.json()
                                toast.success(`${data.count} utilisateurs supprimés`)
                                
                                // Refresh users
                                const usersRes = await fetch('/api/admin/users')
                                if (usersRes.ok) {
                                    setUsers(await usersRes.json())
                                }
                                setSelectedUserIds([])
                            } catch (e: any) {
                                toast.error(e.message || 'Erreur lors de la suppression')
                            }
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-md transition-colors"
                    >
                        Supprimer
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-white/10">
              <th className="pb-4 pl-6 w-10">
                <input 
                    type="checkbox" 
                    onChange={handleSelectAll}
                    checked={selectedUserIds.length > 0 && selectedUserIds.length === filteredUsers.length}
                    className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                />
              </th>
              <th className="pb-4 text-gray-400 font-medium">Utilisateur</th>
              <th className="pb-4 text-gray-400 font-medium">Email</th>
              <th className="pb-4 text-gray-400 font-medium">Source</th>
              <th className="pb-4 pr-6 text-gray-400 font-medium">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((user) => (
              <tr key={user.id} className={`group transition-colors ${selectedUserIds.includes(user.id) ? 'bg-indigo-500/5 hover:bg-indigo-500/10' : 'hover:bg-white/5'}`}>
                <td className="py-4 pl-6">
                    <input 
                        type="checkbox" 
                        checked={selectedUserIds.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                </td>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-700">
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt={user.name || ''}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="font-medium text-white">{user.name}</span>
                  </div>
                </td>
                <td className="py-4 text-gray-300">{user.email}</td>
                <td className="py-4">
                    <div className="flex gap-1">
                        {user.embyUserId && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                Emby
                            </span>
                        )}
                        {user.plexUserId && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                Plex
                            </span>
                        )}
                        {user.jellyfinUserId && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Jellyfin
                            </span>
                        )}
                        {!user.embyUserId && !user.plexUserId && !user.jellyfinUserId && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                                Local
                            </span>
                        )}
                    </div>
                </td>
                <td className="py-4 pr-6">
                  <select
                    value={user.role === 'admin' ? 'admin' : (user.roleId || '')}
                    onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                    disabled={readOnly || updatingId === user.id}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-w-[200px]"
                  >
                    <option value="">Aucun rôle</option>
                    <optgroup label="Système">
                        <option value="admin">Administrateur (Accès complet)</option>
                    </optgroup>
                    {roles.length > 0 && (
                        <optgroup label="Rôles personnalisés">
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </optgroup>
                    )}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

