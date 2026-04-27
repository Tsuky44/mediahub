'use client'

import { Check, Loader2 } from 'lucide-react'

import type {
    AccountRequest,
    TemplateUserOption,
} from '../../_types/account-requests'

interface ApprovalModalProps {
    request: AccountRequest
    templateUsers: TemplateUserOption[]
    customName: string
    templateUserId: string
    isProcessing: boolean
    onCustomNameChange: (value: string) => void
    onTemplateUserIdChange: (value: string) => void
    onCancel: () => void
    onConfirm: () => void
}

export default function ApprovalModal({
    request,
    templateUsers,
    customName,
    templateUserId,
    isProcessing,
    onCustomNameChange,
    onTemplateUserIdChange,
    onCancel,
    onConfirm,
}: ApprovalModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b26] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
                <h3 className="text-xl font-bold text-white">Approuver la demande</h3>

                <div className="space-y-4">
                    <div className="bg-white/5 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">Demandeur :</p>
                        <p className="text-lg font-semibold text-white">{request.firstName}</p>
                        <p className="text-sm text-gray-400">{request.email}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Nom d&apos;utilisateur Emby
                        </label>
                        <input
                            type="text"
                            value={customName}
                            onChange={e => onCustomNameChange(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                            placeholder="Nom du compte Emby"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">
                            Copier les permissions depuis (Optionnel)
                        </label>
                        <select
                            value={templateUserId}
                            onChange={e => onTemplateUserIdChange(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">-- Aucun (Permissions par défaut) --</option>
                            {templateUsers.map(user => (
                                <option key={user.id} value={user.embyUserId || ''}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500">
                            Si sélectionné, le nouvel utilisateur aura les mêmes accès et
                            restrictions que l&apos;utilisateur choisi. De plus, le compte sera
                            automatiquement lié à Emby Connect.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <Check size={20} />
                        )}
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    )
}
