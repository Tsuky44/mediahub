'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { startImpersonation } from '@/app/actions/impersonate'
import type { Role as PermissionRole } from '../../_types/permission'

export interface Role extends PermissionRole {
  id: string
  isSystem: boolean
  _count: {
    users: number
  }
}

export function useRoleManagement(defaultRoleId?: string) {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined)
  const [currentDefaultRoleId, setCurrentDefaultRoleId] = useState<string | undefined>(defaultRoleId)
  const [savingDefault, setSavingDefault] = useState(false)

  useEffect(() => {
    if (defaultRoleId) setCurrentDefaultRoleId(defaultRoleId)
  }, [defaultRoleId])

  const fetchRoles = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const handleSetDefaultRole = async (roleId: string) => {
    if (savingDefault) return
    if (currentDefaultRoleId && roleId === currentDefaultRoleId) return

    if (!confirm("Attention : En changeant le rôle par défaut, tous les utilisateurs ayant actuellement l'ancien rôle par défaut seront migrés vers le nouveau. Voulez-vous continuer ?")) return

    setSavingDefault(true)
    try {
      const response = await fetch('/api/admin/roles/default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set default role')
      }

      const result = await response.json()
      setCurrentDefaultRoleId(roleId)
      toast.success(result.message || 'Rôle par défaut mis à jour')
      fetchRoles()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      toast.error(message)
    } finally {
      setSavingDefault(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) return

    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete role')
      }

      setRoles(prev => prev.filter(r => r.id !== roleId))
      toast.success('Rôle supprimé')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
      toast.error(message)
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

  const handleSaveRole = async (roleData: PermissionRole) => {
    const url = roleData.id ? `/api/admin/roles/${roleData.id}` : '/api/admin/roles'
    const method = roleData.id ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roleData),
    })

    if (!response.ok) throw new Error('Failed to save role')

    await fetchRoles()
    setIsEditing(false)
    setSelectedRole(undefined)
    toast.success('Rôle enregistré')
  }

  const startEditing = (role?: Role) => {
    setSelectedRole(role)
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setSelectedRole(undefined)
  }

  return {
    roles,
    isLoading,
    isEditing,
    selectedRole,
    currentDefaultRoleId,
    savingDefault,
    handleSetDefaultRole,
    handleDelete,
    handleImpersonate,
    handleSaveRole,
    startEditing,
    cancelEditing,
  }
}
