'use client'

import { useState } from 'react'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import type { UserRole, CreateUserPayload } from '../../_types/user'

interface CreateUserModalProps {
    roles: UserRole[]
    onClose: () => void
    onSubmit: (payload: CreateUserPayload) => Promise<boolean>
}

const EMPTY_FORM: CreateUserPayload = {
    name: '',
    email: '',
    password: '',
    roleId: '',
    whatsappNumber: '',
}

/**
 * Modale de creation d'un utilisateur local (nom, email, password, role, whatsapp).
 */
export function CreateUserModal({ roles, onClose, onSubmit }: CreateUserModalProps) {
    const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM)
    const [isCreating, setIsCreating] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsCreating(true)
        const ok = await onSubmit(form)
        setIsCreating(false)
        if (ok) {
            setForm(EMPTY_FORM)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#0c0d0d] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Créer un utilisateur local</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Nom d&apos;utilisateur</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Mot de passe</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 pr-10 text-white focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Rôle</label>
                        <select
                            value={form.roleId}
                            onChange={e => setForm({ ...form, roleId: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Utilisateur (Défaut)</option>
                            {roles.map(role => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Notifications personnelles (Optionnel)</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Numéro WhatsApp</label>
                                <input
                                    type="text"
                                    placeholder="Ex: +33612345678"
                                    value={form.whatsappNumber}
                                    onChange={e => setForm({ ...form, whatsappNumber: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={18} /> : null}
                            Créer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
