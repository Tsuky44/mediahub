'use client'

import { Check, Loader2, X } from 'lucide-react'

interface GroupEditFormProps {
    groupId: string
    name: string
    isLoading: boolean
    onNameChange: (name: string) => void
    onConfirm: (groupId: string, name: string) => void
    onCancel: () => void
}

export default function GroupEditForm({
    groupId,
    name,
    isLoading,
    onNameChange,
    onConfirm,
    onCancel,
}: GroupEditFormProps) {
    return (
        <div className="space-y-5 animate-in fade-in duration-300 relative z-10">
            <div className="flex gap-3">
                <input
                    type="text"
                    value={name}
                    onChange={e => onNameChange(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    autoFocus
                />
                <button
                    onClick={() => onConfirm(groupId, name)}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 rounded-xl disabled:opacity-50 flex items-center justify-center transition-all active:scale-95 hover:shadow-lg hover:shadow-emerald-500/20"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Check className="w-5 h-5" />
                    )}
                </button>
                <button
                    onClick={onCancel}
                    className="bg-white/5 hover:bg-white/10 text-white px-4 rounded-xl transition-all border border-white/5 hover:border-white/10"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    )
}
