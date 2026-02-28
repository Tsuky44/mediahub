'use client'

import React, { useState } from 'react'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'

export function SyncPluginButton({ source, canManage }: { source?: string, canManage?: boolean }) {
  if (canManage === false) return null;

  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSync = async () => {
    setLoading(true)
    setStatus('idle')
    try {
      const response = await fetch('/api/stats/sync-plugin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source: source || 'all' })
      })
      const data = await response.json()
      
      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
        // Refresh page after 2 seconds to show new data
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Erreur de synchronisation')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all duration-300 text-sm font-bold shadow-lg ${
          loading 
            ? 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed' 
            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:shadow-indigo-500/10 hover:-translate-y-0.5'
        }`}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Synchronisation...' : 'Importer toutes les stats (Plex/Emby/Jellyfin)'}
      </button>
      
      {status === 'success' && (
        <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-3 py-1.5 rounded-xl border border-green-400/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <Check className="h-3 w-3" />
          {message}
        </div>
      )}
      
      {status === 'error' && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-3 py-1.5 rounded-xl border border-red-400/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-3 w-3" />
          {message}
        </div>
      )}
    </div>
  )
}
