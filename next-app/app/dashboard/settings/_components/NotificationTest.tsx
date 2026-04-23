
'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { toast } from 'react-hot-toast'

export const NotificationTest = () => {
    const [loading, setLoading] = useState(false)

    const handleTest = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/test-notification', {
                method: 'POST'
            })
            const data = await res.json()
            if (res.ok) {
                toast.success('Notification de test envoyée !')
            } else {
                toast.error(`Erreur: ${data.error}`)
            }
        } catch (error) {
            console.error(error)
            toast.error('Erreur lors de l\'envoi de la notification')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Test de Notification
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Envoyer une notification de test pour vérifier le système WebSocket.
                    </p>
                </div>
                <button
                    onClick={handleTest}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? 'Envoi...' : 'Envoyer un test'}
                </button>
            </div>
        </div>
    )
}
