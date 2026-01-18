'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { X, Edit2, Trash2, Plus, Shield, Loader2, Layout, Server, Download, Settings, Film, MessageSquare, BarChart3, Users } from 'lucide-react'
import clsx from 'clsx'

interface Permission {
    id: string
    name: string
    description: string
    category: string
}

const CATEGORY_CONFIG: Record<string, { label: string, icon: any }> = {
    'DASHBOARD': { label: 'Tableau de bord', icon: Layout },
    'REQUESTS': { label: 'Demandes & Médias', icon: MessageSquare },
    'STATS': { label: 'Statistiques', icon: BarChart3 },
    'DOWNLOADS': { label: 'Téléchargements', icon: Download },
    'DOCKER': { label: 'Docker', icon: Server },
    'ADMIN': { label: 'Administration', icon: Shield },
}

const getTabCategory = (rawCategory: string): string => {
    const cat = rawCategory.toUpperCase()
    if (['ADMIN', 'USERS', 'ROLES', 'SETTINGS', 'LOGS', 'SYSTEM'].includes(cat)) return 'ADMIN'
    if (['REQUESTS', 'MEDIA'].includes(cat)) return 'REQUESTS'
    if (['STATS'].includes(cat)) return 'STATS'
    if (['DOWNLOADS'].includes(cat)) return 'DOWNLOADS'
    if (['DOCKER'].includes(cat)) return 'DOCKER'
    if (['DASHBOARD'].includes(cat)) return 'DASHBOARD'
    return 'ADMIN' // Fallback
}

const getPermissionLabel = (name: string) => {
    switch (name) {
        // Administration
        case 'admin.access': return 'Accès Administration'
        case 'users.view': return 'Voir les utilisateurs'
        case 'users.manage': return 'Gérer les utilisateurs'
        case 'roles.manage': return 'Gérer les rôles & permissions'
        case 'settings.view': return 'Voir les réglages'
        case 'settings.manage': return 'Modifier les réglages'
        case 'logs.view': return 'Voir les logs système'
        
        // Docker
        case 'docker.view': return 'Voir les conteneurs'
        case 'docker.manage': return 'Contrôler les conteneurs (Start/Stop)'
        
        // Téléchargements
        case 'downloads.view': return 'Voir les téléchargements'
        case 'downloads.manage': return 'Gérer les téléchargements'
        
        // Requêtes
        case 'requests.view': return 'Voir toutes les demandes'
        case 'requests.create': return 'Demander des films & séries'
        case 'requests.manage': return 'Gérer les demandes (Approuver/Refuser)'
        
        // Médias
        case 'media.manage': return 'Gérer la médiathèque (Emby)'
        
        // Stats
        case 'stats.view': return 'Voir les statistiques'
        
        // Dashboard
        case 'dashboard.view': return 'Accès Tableau de bord'

        default:
            if (name.endsWith('.manage')) return 'Contrôle Total'
            if (name.endsWith('.view')) return 'Lecture Seule'
            return name
    }
}

interface Role {
    id: string
    name: string
    displayName: string
    description: string
    isSystem: boolean
    priority: number
    permissions: Permission[]
    _count?: {
        users: number
    }
}

export default function RoleManagement({ readOnly = false }: { readOnly?: boolean }) {
    const [roles, setRoles] = useState<Role[]>([])
    const [permissions, setPermissions] = useState<Permission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editingRole, setEditingRole] = useState<Partial<Role>>({})
    const [saving, setSaving] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState<string>('ADMIN')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rolesRes, permsRes] = await Promise.all([
                    fetch('/api/admin/roles'),
                    fetch('/api/admin/permissions')
                ])
                
                if (rolesRes.ok && permsRes.ok) {
                    const rolesData = await rolesRes.json()
                    const permsData = await permsRes.json()
                    setRoles(rolesData)
                    setPermissions(permsData)
                    
                    // Select first available category based on order
                    if (permsData.length > 0) {
                        const tabs = new Set(permsData.map((p: Permission) => getTabCategory(p.category)))
                        const order = ['DASHBOARD', 'REQUESTS', 'STATS', 'DOWNLOADS', 'DOCKER', 'ADMIN']
                        const firstTab = order.find(t => tabs.has(t)) || Array.from(tabs)[0] as string
                        setSelectedCategory(firstTab)
                    }
                } else {
                    toast.error('Erreur lors du chargement des données')
                }
            } catch (error) {
                console.error(error)
                toast.error('Erreur de connexion')
            } finally {
                setIsLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleEdit = (role: Role) => {
        setEditingRole({ ...role, permissions: role.permissions.map(p => ({ ...p })) })
        setIsEditing(true)
    }

    const handleCreate = () => {
        setEditingRole({
            name: '',
            displayName: '',
            description: '',
            priority: 0,
            permissions: []
        })
        setIsEditing(true)
    }

    const handleDelete = async (role: Role) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.displayName}" ?`)) return

        try {
            const res = await fetch(`/api/admin/roles/${role.id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setRoles(roles.filter(r => r.id !== role.id))
                toast.success('Rôle supprimé')
            } else {
                const data = await res.json()
                toast.error(data.message || 'Erreur lors de la suppression')
            }
        } catch {
            toast.error('Erreur lors de la suppression')
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const isNew = !editingRole.id
            const url = isNew ? '/api/admin/roles' : `/api/admin/roles/${editingRole.id}`
            const method = isNew ? 'POST' : 'PUT'

            const payload = {
                ...editingRole,
                permissions: editingRole.permissions?.map(p => p.name) || []
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const savedRole = await res.json()
                if (isNew) {
                    setRoles([...roles, savedRole])
                } else {
                    setRoles(roles.map(r => r.id === savedRole.id ? savedRole : r))
                }
                setIsEditing(false)
                toast.success(isNew ? 'Rôle créé' : 'Rôle mis à jour')
            } else {
                const text = await res.text()
                toast.error(text || 'Erreur lors de la sauvegarde')
            }
        } catch (error) {
            console.error(error)
            toast.error('Erreur lors de la sauvegarde')
        } finally {
            setSaving(false)
        }
    }

    const togglePermission = (permName: string) => {
        const currentPerms = editingRole.permissions || []
        const hasPerm = currentPerms.some(p => p.name === permName)
        
        if (hasPerm) {
            setEditingRole({
                ...editingRole,
                permissions: currentPerms.filter(p => p.name !== permName)
            })
        } else {
            const permObj = permissions.find(p => p.name === permName)
            if (permObj) {
                setEditingRole({
                    ...editingRole,
                    permissions: [...currentPerms, permObj]
                })
            }
        }
    }

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const tab = getTabCategory(perm.category)
        if (!acc[tab]) acc[tab] = []
        acc[tab].push(perm)
        return acc
    }, {} as Record<string, Permission[]>)

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    if (isEditing) {
        return (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">
                        {editingRole.id ? 'Modifier le rôle' : 'Créer un rôle'}
                    </h3>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                        <X />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nom technique (unique)</label>
                            <input
                                type="text"
                                value={editingRole.name}
                                onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                                disabled={!!editingRole.id || readOnly}
                                className="w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:ring-indigo-500"
                                placeholder="ex: moderator"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Nom d&apos;affichage</label>
                            <input
                                type="text"
                                value={editingRole.displayName || ''}
                                onChange={e => setEditingRole({ ...editingRole, displayName: e.target.value })}
                                disabled={readOnly}
                                className="w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:ring-indigo-500"
                                placeholder="ex: Modérateur"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                        <input
                            type="text"
                            value={editingRole.description || ''}
                            onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                            disabled={readOnly}
                            className="w-full rounded-md border-gray-600 bg-gray-700 py-2 px-3 text-white focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-4">Permissions</label>
                        
                        <div className="flex flex-col lg:flex-row gap-6">
                            {/* Tabs Navigation */}
                            <div className="lg:w-64 flex-shrink-0">
                                <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 custom-scrollbar">
                                    {Object.keys(groupedPermissions)
                                        .sort((a, b) => {
                                            const order = ['DASHBOARD', 'REQUESTS', 'STATS', 'DOWNLOADS', 'DOCKER', 'ADMIN']
                                            return order.indexOf(a) - order.indexOf(b)
                                        })
                                        .map((category) => {
                                        const config = CATEGORY_CONFIG[category] || { label: category, icon: Shield }
                                        const Icon = config.icon
                                        const isActive = selectedCategory === category
                                        const activeCount = groupedPermissions[category]?.filter(p => 
                                            editingRole.permissions?.some(rp => rp.name === p.name)
                                        ).length || 0
                                        const totalCount = groupedPermissions[category]?.length || 0

                                        return (
                                            <button
                                                key={category}
                                                onClick={() => setSelectedCategory(category)}
                                                className={clsx(
                                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap",
                                                    isActive 
                                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/20" 
                                                        : "bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white"
                                                )}
                                            >
                                                <Icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-gray-500")} />
                                                <span className="flex-1 text-left">{config.label}</span>
                                                {activeCount > 0 && (
                                                    <span className={clsx(
                                                        "text-[10px] px-2 py-0.5 rounded-full font-bold",
                                                        isActive ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-400"
                                                    )}>
                                                        {activeCount}/{totalCount}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 bg-gray-800/30 rounded-2xl p-6 border border-white/5 min-h-[300px]">
                                {selectedCategory && groupedPermissions[selectedCategory] ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                                {CATEGORY_CONFIG[selectedCategory]?.icon && (
                                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                                        {(() => {
                                                            const Icon = CATEGORY_CONFIG[selectedCategory].icon
                                                            return <Icon className="w-5 h-5 text-indigo-400" />
                                                        })()}
                                                    </div>
                                                )}
                                                {CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory}
                                            </h4>
                                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">
                                                {groupedPermissions[selectedCategory].length} options
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {groupedPermissions[selectedCategory].map(perm => {
                                                const isSelected = editingRole.permissions?.some(p => p.name === perm.name)
                                                return (
                                                    <label 
                                                        key={perm.id} 
                                                        className={clsx(
                                                            "flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                                                            isSelected 
                                                                ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)]" 
                                                                : "bg-gray-800/40 border-transparent hover:bg-gray-800/60 hover:border-gray-700"
                                                        )}
                                                    >
                                                        <div className="relative flex items-center justify-center mt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => togglePermission(perm.name)}
                                                                disabled={readOnly}
                                                                className="peer sr-only"
                                                            />
                                                            <div className={clsx(
                                                                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                                                                isSelected 
                                                                    ? "bg-indigo-600 border-indigo-600" 
                                                                    : "border-gray-600 group-hover:border-gray-500"
                                                            )}>
                                                                {isSelected && <Plus className="w-3 h-3 text-white rotate-45" style={{ transform: 'rotate(0deg)' }} />} 
                                                                {/* Using Plus icon rotated as check or just Plus? Actually Check icon is better but let's stick to simple CSS or reuse an icon */}
                                                                <svg className={clsx("w-3 h-3 text-white transition-transform", isSelected ? "scale-100" : "scale-0")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className={clsx("font-bold transition-colors", isSelected ? "text-indigo-400" : "text-gray-300")}>
                                                                {getPermissionLabel(perm.name)}
                                                            </div>
                                                            <div className="text-sm text-gray-500 mt-1 leading-relaxed">
                                                                {perm.description}
                                                            </div>
                                                        </div>
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                        <Shield className="w-12 h-12 mb-4 opacity-20" />
                                        <p>Sélectionnez une catégorie</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || readOnly}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                            Sauvegarder
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Gestion des Rôles</h3>
                {!readOnly && (
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nouveau rôle
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map(role => (
                    <div key={role.id} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:border-indigo-500/50 transition-colors">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-700/50 text-gray-400'}`}>
                                    <Shield className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-white font-medium">{role.displayName}</h4>
                                    <p className="text-xs text-gray-500">{role.description}</p>
                                </div>
                            </div>
                            {!readOnly && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(role)}
                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    {!role.isSystem && (
                                        <button
                                            onClick={() => handleDelete(role)}
                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-gray-500">
                            <span>{role.permissions.length} permissions</span>
                            <span>{role._count?.users || 0} utilisateurs</span>
                        </div>
                    </div>
                ))}
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    )
}
