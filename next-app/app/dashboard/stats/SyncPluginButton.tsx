'use client'

import React, { useState } from 'react'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'

export function SyncPluginButton({ source }: { source?: string }) {
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
        body: JSON.stringify({ source })
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
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${
          loading 
            ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
            : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-500/50'
        }`}
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Synchronisation...' : 'Importer depuis Playback Reporting'}
      </button>
      
      {status === 'success' && (
        <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-lg border border-green-400/20">
          <Check className="h-3 w-3" />
          {message}
        </div>
      )}
      
      {status === 'error' && (
        <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">
          <AlertCircle className="h-3 w-3" />
          {message}
        </div>
      )}
    </div>
  )
}
