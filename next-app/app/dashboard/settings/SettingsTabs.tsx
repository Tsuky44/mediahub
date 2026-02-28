'use client'

import React, { useState, useEffect } from 'react'
import { Users, Link as LinkIcon, Server, Database, Shield, UsersRound } from 'lucide-react'
import { useAbility } from '@casl/react'
import { AbilityContext } from '@/components/AbilityContext'
import { useSearchParams } from 'next/navigation'
import UserManagement from './UserManagement'
import SettingsForm from './SettingsForm'
import LinkedAccounts from './LinkedAccounts'
import BackupManagement from './BackupManagement'
import RoleManagement from './RoleManagement'
import UserGroupManagement from './UserGroupManagement'

interface SettingsTabsProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dbUsers: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    settings: any
    userRole: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roles: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userGroups: any[]
}

export default function SettingsTabs({ 
    dbUsers, 
    settings,
    userRole,
    roles,
    userGroups
}: SettingsTabsProps) {
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab')

    const ability = useAbility(AbilityContext)
    // Use userRole from server to avoid hydration flicker, combined with CASL ability
    const isAdmin = userRole === 'admin' || ability.can('manage', 'all')
    
    // User requested strict restriction: "tout se qui est dans l'onglet paramètre laisse le pour les administrateur"
    // So we remove granular checks for settings and force admin only.
    const hasSettingsView = isAdmin
    const hasUsersView = isAdmin
    const hasGroupsView = isAdmin
    const hasLinkingView = isAdmin
    const hasBackupView = isAdmin
    const hasRolesView = isAdmin

    const canManageSettings = isAdmin
    const canManageUsers = isAdmin

    // Determine initial active tab based on permissions
    const getInitialTab = () => {
        if (tabParam && ['services', 'users', 'groups', 'roles', 'linking', 'backup'].includes(tabParam)) {
            return tabParam as any
        }
        if (hasSettingsView) return 'services'
        if (hasUsersView) return 'users'
        if (hasGroupsView) return 'groups'
        if (hasRolesView) return 'roles'
        if (hasLinkingView) return 'linking'
        if (hasBackupView) return 'backup'
        return 'services' // Fallback
    }

    const [activeTab, setActiveTab] = useState<'services' | 'users' | 'groups' | 'linking' | 'backup' | 'roles'>(getInitialTab())

    // Update tab if URL param changes (optional, but good for back/forward navigation)
    useEffect(() => {
        if (tabParam && ['services', 'users', 'groups', 'roles', 'linking', 'backup'].includes(tabParam)) {
            setActiveTab(tabParam as any)
        }
    }, [tabParam])

    return (
        <div className="w-full mx-auto space-y-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-black text-white tracking-tight">Paramètres</h2>
                
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 flex-wrap">
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
                    {hasGroupsView && (
                        <button
                            onClick={() => setActiveTab('groups')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'groups' 
                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <UsersRound size={16} />
                            Groupes
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
                            Lier
                        </button>
                    )}
                    {hasBackupView && (
                        <button
                            onClick={() => setActiveTab('backup')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === 'backup' 
                                    ? 'bg-indigo-600 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Database size={16} />
                            Sauvegarde
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                {activeTab === 'services' && hasSettingsView && (
                    <SettingsForm 
                        settings={settings}
                        readOnly={!canManageSettings}
                    />
                )}
                {activeTab === 'users' && hasUsersView && (
                    <UserManagement
                        initialUsers={dbUsers}
                        roles={roles}
                        readOnly={!canManageUsers}
                    />
                )}
                {activeTab === 'groups' && hasGroupsView && (
                    <UserGroupManagement
                        initialGroups={userGroups}
                        users={dbUsers}
                        roles={roles}
                    />
                )}
                {activeTab === 'roles' && hasRolesView && (
                    <RoleManagement defaultRoleId={settings.default_role_id} />
                )}
                {activeTab === 'linking' && hasLinkingView && (
                    <LinkedAccounts />
                )}
                {activeTab === 'backup' && hasBackupView && (
                    <BackupManagement />
                )}
            </div>
        </div>
    )
}
