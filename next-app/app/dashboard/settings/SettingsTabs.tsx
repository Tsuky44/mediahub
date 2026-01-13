'use client'

import React, { useState } from 'react'
import { Settings as SettingsIcon, Users, Link as LinkIcon, Server } from 'lucide-react'
import UserManagement from './UserManagement'
import SettingsForm from './SettingsForm'
import LinkedAccounts from './LinkedAccounts'

interface SettingsTabsProps {
    dbUsers: any[]
    instancesWithSettings: any[]
    currentInstanceId: number
    jellyseerrUsers: any[]
}

export default function SettingsTabs({ dbUsers, instancesWithSettings, currentInstanceId, jellyseerrUsers }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState<'services' | 'users' | 'linking'>('services')

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-black text-white tracking-tight">Paramètres</h2>
                
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
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
                </div>
            </div>

            <div className="min-h-[60vh]">
                {activeTab === 'services' && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 animate-fade-in">
                        <h3 className="text-xl font-bold text-white mb-6">Configuration des services</h3>
                        <SettingsForm 
                            instances={instancesWithSettings}
                            currentInstanceId={currentInstanceId}
                            users={jellyseerrUsers}
                        />
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="animate-fade-in">
                        <UserManagement initialUsers={dbUsers} />
                    </div>
                )}

                {activeTab === 'linking' && (
                    <div className="animate-fade-in">
                        <LinkedAccounts />
                    </div>
                )}
            </div>
        </div>
    )
}
