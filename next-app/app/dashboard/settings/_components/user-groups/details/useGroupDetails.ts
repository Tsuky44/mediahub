'use client'

import { useState } from 'react'

export function useGroupDetails(
  groupId: string,
  onUpdate: (groupId: string, name: string, roleId: string) => void,
  onDelete: (groupId: string) => void,
  onAddMembers: (groupId: string, userIds: number[]) => void,
  onRemoveMember: (groupId: string, userId: number) => void
) {
  const [isEditing, setIsEditing] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
      onDelete(groupId)
    }
  }

  const handleRemoveMember = (userId: number) => {
    if (confirm('Retirer cet utilisateur du groupe ?')) {
      onRemoveMember(groupId, userId)
    }
  }

  const handleSave = (name: string, roleId: string) => {
    onUpdate(groupId, name, roleId)
    setIsEditing(false)
  }

  const handleAdd = (userIds: number[]) => {
    onAddMembers(groupId, userIds)
    setShowAddMember(false)
  }

  return {
    isEditing,
    setIsEditing,
    showAddMember,
    setShowAddMember,
    handleDelete,
    handleRemoveMember,
    handleSave,
    handleAdd,
  }
}
