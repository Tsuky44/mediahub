'use client'

import React, { useState } from 'react'
import { Users, Link as LinkIcon, Server, Shield } from 'lucide-react'
import UserManagement from './UserManagement'
import RoleManagement from './RoleManagement'
import SettingsForm from './SettingsForm'
import LinkedAccounts from './LinkedAccounts'

interface SettingsTabsProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbUsers: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instancesWithSettings: any[]
    currentInstanceId: number
    userRole: string
    userPermissions: string[]
}

export default function SettingsTabs({ 
    dbUsers, 
    instancesWithSettings, 
    currentInstanceId,
    userRole,
    userPermissions
}: SettingsTabsProps) {
    const isAdmin = userRole === 'admin'
    const hasSettingsView = isAdmin || userPermissions.includes('settings.view') || userPermissions.includes('settings.manage')
    const hasUsersView = isAdmin || userPermissions.includes('users.view') || userPermissions.includes('users.manage')
    const hasRolesView = isAdmin || userPermissions.includes('roles.manage')
    const hasLinkingView = isAdmin || userPermissions.includes('settings.manage')

    const canManageSettings = isAdmin || userPermissions.includes('settings.manage')
    const canManageUsers = isAdmin || userPermissions.includes('users.manage')
    const canManageRoles = isAdmin || userPermissions.includes('roles.manage')

    // Determine initial active tab based on permissions
    const getInitialTab = () => {
        if (hasSettingsView) return 'services'
        if (hasUsersView) return 'users'
        if (hasRolesView) return 'roles'
        if (hasLinkingView) return 'linking'
        return 'services' // Fallback
    }

    const [activeTab, setActiveTab] = useState<'services' | 'users' | 'linking' | 'roles'>(getInitialTab())

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-black text-white tracking-tight">Paramètres</h2>
                
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    {hasSettingsView && (
                        <button
                            onClick={() => setActiveTab('services')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'services' 
                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Server size={16} />
                            Services
                        </button>
                    )}
                    {hasUsersView && (
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'users' 
                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Users size={16} />
                            Utilisateurs
                        </button>
                    )}
                    {hasRolesView && (
                        <button
                            onClick={() => setActiveTab('roles')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'roles' 
                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Shield size={16} />
                            Rôles
                        </button>
                    )}
                    {hasLinkingView && (
                        <button
                            onClick={() => setActiveTab('linking')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'linking' 
                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <LinkIcon size={16} />
                            Comptes Liés
                        </button>
                    )}
                </div>
            </div>

            <div className="min-h-[60vh]">
                {activeTab === 'services' && hasSettingsView && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-6">Configuration des services</h3>
                        <SettingsForm 
                            instances={instancesWithSettings}
                            currentInstanceId={currentInstanceId}
                            readOnly={!canManageSettings}
                        />
                    </div>
                )}

                {activeTab === 'users' && hasUsersView && (
                    <div className="animate-fade-in">
                        <UserManagement 
                            initialUsers={dbUsers} 
                            readOnly={!canManageUsers}
                        />
                    </div>
                )}

                {activeTab === 'roles' && hasRolesView && (
                    <div className="animate-fade-in">
                        <RoleManagement 
                            readOnly={!canManageRoles}
                        />
                    </div>
                )}

                {activeTab === 'linking' && hasLinkingView && (
                    <div className="animate-fade-in">
                        <LinkedAccounts />
                    </div>
                )}
            </div>
        </div>
    )
}
