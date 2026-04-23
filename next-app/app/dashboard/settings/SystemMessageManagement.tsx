'use client'

import React, { useState, useEffect } from 'react'
import { Save, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react'

export default function SystemMessageManagement() {
  const [content, setContent] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [welcomeEnabled, setWelcomeEnabled] = useState(true)
  const [bannerContent, setBannerContent] = useState('')
  const [bannerEnabled, setBannerEnabled] = useState(false)
  const [bannerSpeed, setBannerSpeed] = useState(20)
  const [version, setVersion] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/system-message')
      if (!res.ok) throw new Error('Impossible de récupérer les paramètres')
      const data = await res.json()
      setContent(data.content)
      setEnabled(data.enabled)
      setWelcomeEnabled(data.welcomeEnabled ?? true)
      setBannerContent(data.bannerContent || '')
      setBannerEnabled(data.bannerEnabled || false)
      setBannerSpeed(data.bannerSpeed || 20)
      setVersion(data.version)
    } catch (error: any) {
      console.error(error)
      setStatus({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setStatus(null)

      const res = await fetch('/api/admin/system-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, enabled, welcomeEnabled, bannerContent, bannerEnabled, bannerSpeed })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      const data = await res.json()
      setVersion(data.version)
      setStatus({ type: 'success', message: 'Messages système mis à jour avec succès' })
      
      // Clear success message after 3 seconds
      setTimeout(() => setStatus(null), 3000)
    } catch (error: any) {
      console.error(error)
      setStatus({ type: 'error', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Chargement...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-black/20 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/20 rounded-lg">
            <MessageSquare className="text-indigo-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Message Système (Pop-up)</h2>
            <p className="text-sm text-gray-400">
              Configurez un message qui s'affichera pour tous les utilisateurs à leur prochaine connexion.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Status Message */}
          {status && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              status.type === 'success' 
                ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{status.message}</span>
            </div>
          )}

          {/* Welcome Message Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
            <div>
              <label className="text-base font-medium text-white">Message de Bienvenue (Tutoriel)</label>
              <p className="text-sm text-gray-400">
                Afficher le message de bienvenue par défaut lors de la première connexion.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={welcomeEnabled}
                onChange={(e) => setWelcomeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <hr className="border-white/10" />

          {/* Popup Message Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Message Pop-up (Post-connexion)
            </h3>
            
            <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">Activer le pop-up</label>
                  <p className="text-xs text-gray-500">S'affiche une seule fois par version après la connexion.</p>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    enabled ? 'bg-indigo-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Contenu du message
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y"
                  placeholder="Entrez votre message pop-up ici..."
                />
                <p className="text-xs text-gray-500">
                  Version actuelle: <span className="font-mono text-indigo-400">{version}</span> (Une modification forcera la réapparition)
                </p>
              </div>
            </div>
          </div>

          {/* Banner Message Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Bannière de Login (Pré-connexion)
            </h3>
            
            <div className="bg-black/20 rounded-xl border border-white/5 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-300">Activer la bannière</label>
                  <p className="text-xs text-gray-500">S'affiche en permanence sur la page de connexion.</p>
                </div>
                <button
                  onClick={() => setBannerEnabled(!bannerEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    bannerEnabled ? 'bg-emerald-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      bannerEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Contenu de la bannière
                </label>
                <textarea
                  value={bannerContent}
                  onChange={(e) => setBannerContent(e.target.value)}
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-y"
                  placeholder="Entrez votre message de bannière ici..."
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-300">
                    Vitesse de défilement (durée de l'animation)
                  </label>
                  <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-emerald-400">{bannerSpeed}s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="1"
                  value={bannerSpeed}
                  onChange={(e) => setBannerSpeed(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Rapide (5s)</span>
                  <span>Lent (60s)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                saving ? 'animate-pulse' : ''
              }`}
            >
              <Save size={18} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder et Publier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
