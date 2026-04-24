'use client'

import { Check } from 'lucide-react'
import type { TrackerFormData, TrackerType } from '../../_types/tracker'
import { TRACKER_TYPES } from '../../_utils/tracker-labels'

interface TrackerFormProps {
    formData: TrackerFormData
    editingId: string | null
    onChange: (data: TrackerFormData) => void
    onSubmit: (e: React.FormEvent) => void
    onCancel: () => void
}

/** Formulaire d'ajout/edition d'un tracker (nom, type, URL, credentials, activation). */
export function TrackerForm({ formData, editingId, onChange, onSubmit, onCancel }: TrackerFormProps) {
    const setField = (field: keyof TrackerFormData, value: any) => {
        onChange({ ...formData, [field]: value })
    }

    return (
        <form onSubmit={onSubmit} className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nom du tracker</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="Ex: Redacted"
                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setField('type', e.target.value as TrackerType)}
                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        {TRACKER_TYPES.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">URL de base</label>
                    <input
                        type="url"
                        value={formData.baseUrl}
                        onChange={(e) => setField('baseUrl', e.target.value)}
                        placeholder="https://tracker.example.com"
                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Clé API / Passkey</label>
                    <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setField('apiKey', e.target.value)}
                        placeholder={editingId ? '•••••••• (laisser vide pour garder)' : ''}
                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nom d&apos;utilisateur</label>
                    <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setField('username', e.target.value)}
                        placeholder={editingId ? '•••••••• (laisser vide pour garder)' : ''}
                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Mot de passe</label>
                    <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setField('password', e.target.value)}
                        placeholder={editingId ? '•••••••• (laisser vide pour garder)' : ''}
                        className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Activer</label>
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            type="checkbox"
                            checked={formData.enabled}
                            onChange={(e) => setField('enabled', e.target.checked)}
                            className="w-4 h-4 rounded border-white/10 bg-gray-900 text-indigo-600"
                        />
                        <span className="text-sm text-gray-300">{formData.enabled ? 'Activé' : 'Désactivé'}</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    <Check className="w-4 h-4" />
                    {editingId ? 'Modifier' : 'Ajouter'}
                </button>
            </div>
        </form>
    )
}
