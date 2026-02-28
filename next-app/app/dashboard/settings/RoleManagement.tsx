'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Shield, Trash2, Edit2, Users, Eye } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import RoleEditor from './RoleEditor'
import { startImpersonation } from '@/app/actions/impersonate'

interface Role {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  _count: {
    users: number
  }
}

export default function RoleManagement({ defaultRoleId }: { defaultRoleId?: string }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined)
  const [currentDefaultRoleId, setCurrentDefaultRoleId] = useState<string | undefined>(defaultRoleId)
  const [savingDefault, setSavingDefault] = useState(false)

  useEffect(() => {
    fetchRoles()
    // Fetch default role ID if not provided? 
    // Wait, the parent component passes it. But if it changes, we should update local state.
    if (defaultRoleId) setCurrentDefaultRoleId(defaultRoleId)
  }, [defaultRoleId])

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles')
      if (!response.ok) throw new Error('Failed to fetch roles')
      const data = await response.json()
      setRoles(data)
    } catch (error) {
      toast.error('Erreur lors du chargement des rôles')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetDefaultRole = async (roleId: string) => {
    if (savingDefault) return
    if (currentDefaultRoleId && roleId === currentDefaultRoleId) return

    if (!confirm('Attention : En changeant le rôle par défaut, tous les utilisateurs ayant actuellement l\'ancien rôle par défaut seront migrés vers le nouveau. Voulez-vous continuer ?')) return

    setSavingDefault(true)
    try {
      const response = await fetch('/api/admin/roles/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set default role')
      }

      const result = await response.json()
      setCurrentDefaultRoleId(roleId)
      toast.success(result.message || 'Rôle par défaut mis à jour')
      
      // Refresh roles to update counts?
      fetchRoles()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSavingDefault(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) return

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete role')
      }

      setRoles(roles.filter(r => r.id !== roleId))
      toast.success('Rôle supprimé')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }

  const handleImpersonate = async (roleId: string) => {
    try {
      await startImpersonation(roleId)
      toast.success('Mode aperçu activé dans un nouvel onglet')
      window.open('/', '_blank')
    } catch (error) {
      console.error('Failed to start impersonation:', error)
      toast.error("Erreur lors de l'activation du mode aperçu")
    }
  }

  const handleSaveRole = async (roleData: any) => {
    try {
      const url = roleData.id ? `/api/admin/roles/${roleData.id}` : '/api/admin/roles'
      const method = roleData.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleData)
      })

      if (!response.ok) throw new Error('Failed to save role')
      
      await fetchRoles()
      setIsEditing(false)
      setSelectedRole(undefined)
      toast.success('Rôle enregistré')
    } catch (error) {
      throw error
    }
  }

  if (isEditing) {
    return (
      <RoleEditor
        role={selectedRole}
        onSave={handleSaveRole}
        onCancel={() => {
          setIsEditing(false)
          setSelectedRole(undefined)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Rôle par défaut</h3>
        <p className="text-gray-400 mb-4">
          Le rôle par défaut est attribué aux nouveaux utilisateurs. 
          En changeant ce rôle, <strong>tous les utilisateurs ayant l'ancien rôle par défaut seront automatiquement migrés vers le nouveau.</strong>
        </p>
        
        <div className="flex items-center gap-4">
            <select
                value={currentDefaultRoleId || ''}
                onChange={(e) => handleSetDefaultRole(e.target.value)}
                disabled={savingDefault}
                className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
                <option value="">Aucun rôle par défaut</option>
                {roles.map(role => (
                    <option key={role.id} value={role.id}>
                        {role.name}
                    </option>
                ))}
            </select>
            {savingDefault && <div className="text-indigo-400 text-sm animate-pulse">Mise à jour en cours...</div>}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Gestion des rôles
            </h3>
            <p className="text-gray-400 text-sm mt-1">Créez et gérez les rôles utilisateurs et leurs permissions</p>
        </div>
        <button
          onClick={() => {
            setSelectedRole(undefined)
            setIsEditing(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} />
          Nouveau rôle
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all relative overflow-hidden">
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:text-indigo-300 transition-colors">
                  <Shield size={20} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleImpersonate(role.id)}
                    className="p-2 text-gray-400 hover:text-indigo-400 transition-colors rounded-lg hover:bg-indigo-500/10"
                    title="Voir en tant que ce rôle"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRole(role)
                      setIsEditing(true)
                    }}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                    title="Modifier"
                  >
                    <Edit2 size={16} />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <h4 className="text-lg font-bold text-white mb-1 relative z-10">{role.name}</h4>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2 h-10 relative z-10">
                {role.description || 'Aucune description'}
              </p>

              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-black/20 py-2 px-3 rounded-lg w-fit relative z-10">
                <Users size={14} />
                {role._count?.users || 0} utilisateurs
              </div>
              
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
