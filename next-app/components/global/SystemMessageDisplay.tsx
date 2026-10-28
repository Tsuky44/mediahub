'use client'

import React, { useState, useEffect } from 'react'
import { X, MessageSquare, Info } from 'lucide-react'
import { createPortal } from 'react-dom'

export function SystemMessageDisplay() {
  const [show, setShow] = useState(false)
  const [content, setContent] = useState('')
  const [version, setVersion] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessage()
  }, [])

  const fetchMessage = async () => {
    try {
      const res = await fetch('/api/user/system-message')
      if (res.ok) {
        const data = await res.json()
        if (data.show) {
          setContent(data.content)
          setVersion(data.version)
          setShow(true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch system message', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = async () => {
    try {
      await fetch('/api/user/system-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      })
      setShow(false)
    } catch (error) {
      console.error('Failed to acknowledge message', error)
    }
  }

  if (loading || !show) return null

  // Ensure we are in browser
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#0c0d0d] border border-indigo-500/30 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Info className="text-indigo-400" size={24} />
            </div>
            <h2 className="text-xl font-bold text-white">Message Système</h2>
          </div>
          {/* Optional: Allow closing without ack? Probably yes, but requirement says "si le message est lu une fois il ne reviens plus". 
              So clicking X implies "read". */}
          <button 
            onClick={handleDismiss}
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="prose prose-invert max-w-none text-gray-200 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/20 px-6 py-4 border-t border-white/5 flex justify-end">
          <button
            onClick={handleDismiss}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-900/20"
          >
            J'ai compris
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
