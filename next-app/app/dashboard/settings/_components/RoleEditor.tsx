'use client'

import React, { useState } from 'react'
import { Save, X, Shield } from 'lucide-react'
import { toast } from 'react-hot-toast'

import type { Permission, Role } from '../_types/permission'
import {
    togglePermissionWithImplications,
    toggleMediaRequestSyncOrManage,
} from '../_utils/role-permissions'
import { ROLE_TABS, ROLE_PERMISSION_TABS, findTabConfig } from '../_utils/role-tabs-config'

import { RoleTabsNav } from './roles/RoleTabsNav'
import { RolePermissionsPanel } from './roles/RolePermissionsPanel'

export type { Role } from '../_types/permission'

interface RoleEditorProps {
    role?: Role
    onSave: (role: Role) => Promise<void>
    onCancel: () => void
}

export default function RoleEditor({ role, onSave, onCancel }: RoleEditorProps) {
    const [name, setName] = useState(role?.name || '')
    const [description, setDescription] = useState(role?.description || '')
    const [permissions, setPermissions] = useState<Permission[]>(role?.permissions || [])
    const [activeTab, setActiveTab] = useState(ROLE_TABS[0].id)
    const [isLoading, setIsLoading] = useState(false)

    const togglePermission = (subject: string, action: string) => {
        setPermissions(prev => togglePermissionWithImplications(prev, subject, action))
    }

    const toggleMediaRequestSync = () => {
        setPermissions(prev => toggleMediaRequestSyncOrManage(prev))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsLoading(true)
        try {
            await onSave({ ...role, name, description, permissions })
            toast.success('Rôle sauvegardé. Les utilisateurs devront se reconnecter pour voir les changements.')
        } catch (error) {
            console.error(error)
            toast.error('Erreur lors de la sauvegarde')
        } finally {
            setIsLoading(false)
        }
    }

    const currentTabConfig = findTabConfig(activeTab)
    const activeTabMeta = ROLE_TABS.find(t => t.id === activeTab)

    return (
        <div className="bg-gray-900 rounded-3xl border border-white/10 overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    {role ? 'Modifier le rôle' : 'Nouveau rôle'}
                </h3>
                <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Nom du rôle</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={role?.isSystem}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Ex: Modérateur"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Description courte du rôle..."
                        />
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <RoleTabsNav tabs={ROLE_TABS} activeTab={activeTab} onChange={setActiveTab} />

                    <div className="bg-black/20 rounded-xl p-6 min-h-[200px] border border-white/5">
                        {currentTabConfig ? (
                            <RolePermissionsPanel
                                tab={currentTabConfig}
                                permissions={permissions}
                                onToggle={togglePermission}
                                onToggleMediaRequestSync={toggleMediaRequestSync}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 border border-white/5 border-dashed rounded-lg min-h-[150px]">
                                <p>Configuration des droits pour {activeTabMeta?.label} (Bientôt disponible)</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || (role?.isSystem && name !== role.name)}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    )
}
