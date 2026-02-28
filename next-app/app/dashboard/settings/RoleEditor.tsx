'use client'

import React, { useState } from 'react'
import { Save, X, Shield, LayoutDashboard, Search, Film, BarChart3, Download, Container, Settings, List, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

function PermissionCheckbox({ 
  label, 
  checked, 
  onChange, 
  description, 
  danger 
}: { 
  label: string
  checked: boolean
  onChange: () => void
  description?: string
  danger?: boolean
}) {
  return (
    <div 
      onClick={onChange}
      className={`
        relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group
        ${checked 
          ? (danger ? 'bg-red-500/10 border-red-500/50' : 'bg-indigo-500/10 border-indigo-500/50') 
          : 'bg-gray-800/50 border-white/5 hover:border-white/10'
        }
      `}
    >
      <div className={`
        mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors
        ${checked 
          ? (danger ? 'bg-red-500 border-red-500' : 'bg-indigo-500 border-indigo-500') 
          : 'border-gray-600 bg-gray-900/50 group-hover:border-gray-500'
        }
      `}>
        {checked && <Check className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="flex-1">
        <h4 className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-300'}`}>
          {label}
        </h4>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

interface Permission {
  action: string
  subject: string
  conditions?: any
}

interface Role {
  id?: string
  name: string
  description: string | null
  isSystem?: boolean
  permissions?: Permission[]
}

interface RoleEditorProps {
  role?: Role
  onSave: (role: Role) => Promise<void>
  onCancel: () => void
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'requests', label: 'Demander', icon: Search },
  { id: 'my_requests', label: 'Mes demandes', icon: List },
  { id: 'media', label: 'Médiathèque', icon: Film },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'downloads', label: 'Téléchargements', icon: Download },
  { id: 'docker', label: 'Docker', icon: Container },
  { id: 'settings', label: 'Paramètres', icon: Settings },
]

export default function RoleEditor({ role, onSave, onCancel }: RoleEditorProps) {
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [permissions, setPermissions] = useState<Permission[]>(role?.permissions || [])
  const [activeTab, setActiveTab] = useState(TABS[0].id)
  const [isLoading, setIsLoading] = useState(false)

  const togglePermission = (subject: string, action: string) => {
    setPermissions(prev => {
      const exists = prev.find(p => p.subject === subject && p.action === action)
      let newPermissions = [...prev]

      if (exists) {
        newPermissions = prev.filter(p => !(p.subject === subject && p.action === action))
      } else {
        newPermissions = [...prev, { subject, action }]

        // Auto-check "Voir l'onglet / faire de recherche" (Media/read)
        // when other permissions in the "Demander" tab are checked
        if (
             (subject === 'MediaRequest' && action === 'create') ||
             (subject === 'Media' && ['interactive_search', 'trigger_search', 'manage_settings'].includes(action))
           ) {
             const hasRead = newPermissions.some(p => p.subject === 'Media' && p.action === 'read')
             if (!hasRead) {
               newPermissions.push({ subject: 'Media', action: 'read' })
             }
        }

        // Auto-check "Voir les téléchargements" (Downloads/read)
        // when "Gérer les téléchargements" is checked
        if (subject === 'Downloads' && action === 'manage') {
             const hasRead = newPermissions.some(p => p.subject === 'Downloads' && p.action === 'read')
             if (!hasRead) {
               newPermissions.push({ subject: 'Downloads', action: 'read' })
             }
        }
      }
      return newPermissions
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await onSave({
        ...role,
        name,
        description,
        permissions
      })
      toast.success('Rôle sauvegardé. Les utilisateurs devront se reconnecter pour voir les changements.')
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsLoading(false)
    }
  }

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
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="bg-black/20 rounded-xl p-6 min-h-[200px] border border-white/5">
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Permissions Dashboard</h4>
                
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'DashboardStats' && p.action === 'read')}
                    onChange={() => togglePermission('DashboardStats', 'read')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Voir les statistiques du serveur (Dashboard Admin)</div>
                    <div className="text-sm text-gray-400">Affiche l'état des services, le stockage et les transferts en haut du dashboard.</div>
                  </div>
                </label>
              </div>
            )}
            
            {activeTab === 'requests' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Permissions Demander</h4>
                
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'Media' && p.action === 'read')}
                    onChange={() => togglePermission('Media', 'read')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Voir l'onglet / faire de recherche</div>
                    <div className="text-sm text-gray-400">Permet d'accéder à la barre de recherche et de voir les fiches films/séries.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'MediaRequest' && p.action === 'create')}
                    onChange={() => togglePermission('MediaRequest', 'create')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Faire des demandes</div>
                    <div className="text-sm text-gray-400">Permet de demander l'ajout de nouveaux films ou séries.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'Media' && p.action === 'interactive_search')}
                    onChange={() => togglePermission('Media', 'interactive_search')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Recherche interactive</div>
                    <div className="text-sm text-gray-400">Permet de choisir manuellement la release à télécharger (via Prowlarr).</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'Media' && p.action === 'trigger_search')}
                    onChange={() => togglePermission('Media', 'trigger_search')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Recherche automatique (Manuelle)</div>
                    <div className="text-sm text-gray-400">Permet de relancer une recherche automatique via le bouton loupe.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'Media' && p.action === 'manage_settings')}
                    onChange={() => togglePermission('Media', 'manage_settings')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Gestion des médias</div>
                    <div className="text-sm text-gray-400">Permet d'accéder au bouton paramètres (suppression, qualité, dossier...).</div>
                  </div>
                </label>
              </div>
            )}

            {activeTab === 'my_requests' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Permissions Mes demandes</h4>
                
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'MediaRequest' && p.action === 'read')}
                    onChange={() => togglePermission('MediaRequest', 'read')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Voir ses demandes</div>
                    <div className="text-sm text-gray-400">Permet de consulter la liste et le statut de ses propres demandes.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'MediaRequest' && p.action === 'delete')}
                    onChange={() => togglePermission('MediaRequest', 'delete')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Supprimer ses demandes</div>
                    <div className="text-sm text-gray-400">Permet de supprimer ses propres demandes.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'MediaRequest' && (p.action === 'sync' || p.action === 'manage'))}
                    onChange={() => {
                      setPermissions(prev => {
                        const hasSyncOrManage = prev.some(p => p.subject === 'MediaRequest' && (p.action === 'sync' || p.action === 'manage'))
                        if (hasSyncOrManage) {
                          return prev.filter(p => !(p.subject === 'MediaRequest' && (p.action === 'sync' || p.action === 'manage')))
                        } else {
                          return [...prev, { subject: 'MediaRequest', action: 'sync' }]
                        }
                      })
                    }}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Synchroniser ses demandes</div>
                    <div className="text-sm text-gray-400">Permet de synchroniser ses propres demandes avec les services externes.</div>
                  </div>
                </label>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Permissions Médiathèque</h4>
                
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                  <input 
                    type="checkbox"
                    checked={permissions.some(p => p.subject === 'Library' && p.action === 'read')}
                    onChange={() => togglePermission('Library', 'read')}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-offset-gray-900 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-white font-medium">Voir la médiathèque</div>
                    <div className="text-sm text-gray-400">Permet d'accéder à la bibliothèque de films et séries.</div>
                  </div>
                </label>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <h3 className="text-lg font-semibold text-white mb-4">Permissions Statistiques</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <PermissionCheckbox
                    label="Voir l'onglet Statistiques + Ses propres stats"
                    checked={permissions.some(p => p.subject === 'Stats' && p.action === 'read')}
                    onChange={() => togglePermission('Stats', 'read')}
                    description="Accès de base à l'onglet et aux stats personnelles"
                  />
                  <PermissionCheckbox
                    label="Voir les statistiques globales"
                    checked={permissions.some(p => p.subject === 'Stats' && p.action === 'read_all')}
                    onChange={() => togglePermission('Stats', 'read_all')}
                    description="Voir les statistiques de tous les utilisateurs"
                  />
                  <PermissionCheckbox
                    label="Utiliser l'importation (Sync)"
                    checked={permissions.some(p => p.subject === 'Stats' && p.action === 'import')}
                    onChange={() => togglePermission('Stats', 'import')}
                    description="Synchroniser l'historique depuis Plex/Emby/Jellyfin"
                  />
                  <PermissionCheckbox
                    label="Gérer le stockage (Lecture seule)"
                    checked={permissions.some(p => p.subject === 'Stats' && p.action === 'manage_storage')}
                    onChange={() => togglePermission('Stats', 'manage_storage')}
                    description="Voir l'analyse détaillée du stockage"
                  />
                  <PermissionCheckbox
                    label="Supprimer des médias"
                    checked={permissions.some(p => p.subject === 'Stats' && p.action === 'delete_media')}
                    onChange={() => togglePermission('Stats', 'delete_media')}
                    description="Droit de suppression définitive des fichiers médias"
                    danger
                  />
                </div>
              </div>
            )}

            {activeTab === 'downloads' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <h3 className="text-lg font-semibold text-white mb-4">Permissions Téléchargements</h3>
                
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Torrents</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PermissionCheckbox
                      label="Voir les téléchargements (Lecture seule)"
                      checked={permissions.some(p => p.subject === 'Downloads' && p.action === 'read')}
                      onChange={() => togglePermission('Downloads', 'read')}
                      description="Voir la liste et la progression sans pouvoir modifier"
                    />
                    <PermissionCheckbox
                      label="Ajouter des torrents"
                      checked={permissions.some(p => p.subject === 'Downloads' && p.action === 'add_torrent')}
                      onChange={() => togglePermission('Downloads', 'add_torrent')}
                      description="Ajouter des torrents via URL ou fichier"
                    />
                    <PermissionCheckbox
                      label="Gérer les torrents (Pause/Reprise/Suppression)"
                      checked={permissions.some(p => p.subject === 'Downloads' && p.action === 'manage_torrents')}
                      onChange={() => togglePermission('Downloads', 'manage_torrents')}
                      description="Contrôle total sur les torrents existants"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Explorateur SMB</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PermissionCheckbox
                      label="Accès Explorateur (Lecture & Téléchargement)"
                      checked={permissions.some(p => p.subject === 'Downloads' && p.action === 'read_explorer')}
                      onChange={() => togglePermission('Downloads', 'read_explorer')}
                      description="Naviguer et télécharger les fichiers"
                    />
                    <PermissionCheckbox
                      label="Créer des liens de partage"
                      checked={permissions.some(p => p.subject === 'Downloads' && p.action === 'share_files')}
                      onChange={() => togglePermission('Downloads', 'share_files')}
                      description="Générer des liens publics temporaires"
                    />
                    <PermissionCheckbox
                      label="Supprimer des fichiers"
                      checked={permissions.some(p => p.subject === 'Downloads' && p.action === 'delete_files')}
                      onChange={() => togglePermission('Downloads', 'delete_files')}
                      description="Supprimer définitivement des fichiers du disque"
                      danger
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Recherche Interactive</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PermissionCheckbox
                      label="Utiliser la Recherche Interactive"
                      checked={permissions.some(p => p.subject === 'Downloads' && p.action === 'interactive_search')}
                      onChange={() => togglePermission('Downloads', 'interactive_search')}
                      description="Rechercher et lancer des téléchargements depuis les indexeurs configurés"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'docker' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <h3 className="text-lg font-semibold text-white mb-4">Permissions Docker</h3>
                
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Accès & Consultation</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PermissionCheckbox
                      label="Voir les conteneurs (Lecture seule)"
                      checked={permissions.some(p => p.subject === 'Docker' && p.action === 'read')}
                      onChange={() => togglePermission('Docker', 'read')}
                      description="Accès à la liste des conteneurs et leur statut (On/Off)"
                    />
                    <PermissionCheckbox
                      label="Voir les détails (Logs/Stats/Config)"
                      checked={permissions.some(p => p.subject === 'Docker' && p.action === 'read_details')}
                      onChange={() => togglePermission('Docker', 'read_details')}
                      description="Accès aux logs en direct, statistiques et configuration"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Gestion</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <PermissionCheckbox
                      label="Contrôler les conteneurs"
                      checked={permissions.some(p => p.subject === 'Docker' && p.action === 'manage_containers')}
                      onChange={() => togglePermission('Docker', 'manage_containers')}
                      description="Démarrer, arrêter, redémarrer et accès à la console"
                      danger
                    />
                    <PermissionCheckbox
                      label="Gérer les groupes"
                      checked={permissions.some(p => p.subject === 'Docker' && p.action === 'manage_groups')}
                      onChange={() => togglePermission('Docker', 'manage_groups')}
                      description="Créer, modifier et supprimer des groupes de conteneurs"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab !== 'dashboard' && activeTab !== 'requests' && activeTab !== 'my_requests' && activeTab !== 'downloads' && activeTab !== 'media' && activeTab !== 'stats' && activeTab !== 'docker' && (
              <div className="flex items-center justify-center h-full text-gray-500 border border-white/5 border-dashed rounded-lg min-h-[150px]">
                <p>Configuration des droits pour {TABS.find(t => t.id === activeTab)?.label} (Bientôt disponible)</p>
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
