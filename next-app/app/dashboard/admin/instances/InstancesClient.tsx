'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Globe, Key, Link as LinkIcon, Server, Ticket, Copy, Check } from 'lucide-react'
import { createInstance, deleteInstance, createInviteCode, deleteInviteCode } from '@/app/actions/instances'
import { toast } from 'react-hot-toast'
import clsx from 'clsx'

interface Instance {
  id: number
  name: string
  slug: string
  embyUrl: string
  embyApiKey: string
  isDefault: boolean
  createdAt: Date
}

interface InviteCode {
  id: number
  code: string
  used: boolean
  createdAt: Date
}

export default function InstancesClient({ initialInstances, initialInviteCodes }: { initialInstances: any[], initialInviteCodes: any[] }) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances)
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>(initialInviteCodes)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    embyUrl: '',
    embyApiKey: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const newInstance = await createInstance(formData)
      setInstances([newInstance as any, ...instances])
      setIsAdding(false)
      setFormData({ name: '', slug: '', embyUrl: '', embyApiKey: '' })
      toast.success('Instance créée avec succès !')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvite = async () => {
    setLoading(true)
    try {
      const newInvite = await createInviteCode()
      setInviteCodes([newInvite as any, ...inviteCodes])
      toast.success('Code d\'invitation généré !')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvite = async (id: number) => {
    setLoading(true)
    try {
      await deleteInviteCode(id)
      setInviteCodes(inviteCodes.filter(i => i.id !== id))
      toast.success('Code supprimé')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success('Copié !')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette instance ? Toutes les données liées seront supprimées.')) return
    
    setLoading(true)
    try {
      await deleteInstance(id)
      setInstances(instances.filter(i => i.id !== id))
      toast.success('Instance supprimée')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          Liste des Instances
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Instance
        </button>
      </div>

      {/* Section des codes d'invitation */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              Codes d'Invitation
            </h3>
            <p className="text-sm text-gray-400">Générez des codes pour permettre à vos amis de créer leur propre instance.</p>
          </div>
          <button
            onClick={handleCreateInvite}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl font-medium border border-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Générer un code
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {inviteCodes.length === 0 ? (
            <div className="col-span-full py-8 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
              Aucun code d'invitation actif.
            </div>
          ) : (
            inviteCodes.map(invite => (
              <div 
                key={invite.id}
                className="bg-black/20 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-amber-500/30 transition-all"
              >
                <div className="flex flex-col">
                  <span className="text-lg font-mono font-bold text-white tracking-wider">{invite.code}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Généré le {new Date(invite.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(invite.code)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Copier le code"
                  >
                    {copiedCode === invite.code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDeleteInvite(invite.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Supprimer le code"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Nom de l'instance</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Serveur de Thomas"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Slug URL (unique)</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="ex: thomas-serv"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">URL Emby</label>
                <input
                  type="url"
                  required
                  value={formData.embyUrl}
                  onChange={e => setFormData({ ...formData, embyUrl: e.target.value })}
                  placeholder="https://emby.exemple.com"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Clé API Emby</label>
                <input
                  type="text"
                  required
                  value={formData.embyApiKey}
                  onChange={e => setFormData({ ...formData, embyApiKey: e.target.value })}
                  placeholder="Clé API"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded-2xl font-bold transition-all disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer l\'instance'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {instances.map(instance => (
          <div 
            key={instance.id}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 space-y-4 hover:border-white/20 transition-all group"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-indigo-500/10 rounded-2xl">
                <Server className="w-6 h-6 text-indigo-400" />
              </div>
              {!instance.isDefault && (
                <button
                  onClick={() => handleDelete(instance.id)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              {instance.isDefault && (
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full">
                  PRINCIPALE
                </span>
              )}
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">{instance.name}</h3>
              <p className="text-sm text-gray-500">Slug: <span className="text-indigo-400 font-mono">{instance.slug}</span></p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <Globe className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{instance.embyUrl}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <Key className="w-4 h-4 flex-shrink-0" />
                <span className="font-mono">••••••••{instance.embyApiKey ? instance.embyApiKey.slice(-4) : '****'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <LinkIcon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">/login?instance={instance.slug}</span>
              </div>
            </div>

            {!instance.isDefault && (
              <div className="pt-4">
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}/login?instance=${instance.slug}`
                    navigator.clipboard.writeText(url)
                    toast.success('Lien copié !')
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-medium text-white transition-all"
                >
                  Copier le lien de connexion
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
