'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface User {
  id: number
  name: string | null
  email: string | null
  image: string | null
  role: string
  roleId: string | null
}

interface Role {
  id: string
  name: string
  displayName: string | null
}

interface UserManagementProps {
  initialUsers: User[]
  readOnly?: boolean
}

export default function UserManagement({ initialUsers, readOnly = false }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [roles, setRoles] = useState<Role[]>([])
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/roles')
        ])

        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(data)
        }
        
        if (rolesRes.ok) {
          const data = await rolesRes.json()
          setRoles(data)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleRoleChange = async (userId: number, newValue: string) => {
    setUpdatingId(userId)
    
    let role = 'user'
    let roleId: string | null = null

    if (newValue.startsWith('role:')) {
      roleId = newValue.replace('role:', '')
      role = 'user'
    } else {
      role = newValue
      roleId = null
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId, role, roleId }),
      })

      if (!response.ok) throw new Error('Failed to update role')

      setUsers(users.map(u => u.id === userId ? { ...u, role, roleId } : u))
      toast.success('Rôle mis à jour')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Gestion des utilisateurs</h3>
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            Synchronisation Emby...
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-400 text-sm border-b border-white/10">
              <th className="pb-4 font-medium">Utilisateur</th>
              <th className="pb-4 font-medium">Rôle</th>
              <th className="pb-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => {
              const roleName = user.roleId 
                ? roles.find(r => r.id === user.roleId)?.displayName || 'Rôle personnalisé'
                : user.role === 'admin' ? 'Administrateur'
                : user.role === 'user_plus' ? 'Utilisateur +'
                : 'Utilisateur';
                
              return (
                <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-800 border border-white/10">
                        {user.image ? (
                          <Image src={user.image} alt={user.name || ''} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                            {(user.name || '?')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.name || 'Sans nom'}</div>
                        <div className="text-gray-500 text-xs">{user.email || 'Pas d\'email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' :
                      user.roleId ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'user_plus' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {roleName}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <select
                      value={user.roleId ? `role:${user.roleId}` : user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={updatingId === user.id || readOnly}
                      className={`bg-black/40 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <optgroup label="Rôles système">
                        <option value="user">Utilisateur</option>
                        <option value="user_plus">Utilisateur +</option>
                        <option value="admin">Administrateur</option>
                      </optgroup>
                      {roles.length > 0 && (
                        <optgroup label="Rôles personnalisés">
                          {roles.map(role => (
                            <option key={role.id} value={`role:${role.id}`}>
                              {role.displayName || role.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
