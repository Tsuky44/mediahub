'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Globe, Key, Link as LinkIcon, Server } from 'lucide-react'
import { createInstance, deleteInstance } from '@/app/actions/instances'
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

export default function InstancesClient({ initialInstances }: { initialInstances: any[] }) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(false)
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
      <div className="flex justify-end">
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Instance
        </button>
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
                <span className="font-mono">••••••••{instance.embyApiKey.slice(-4)}</span>
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
