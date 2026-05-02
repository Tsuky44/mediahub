'use client'

import { AlertCircle, Loader2, Send } from 'lucide-react'

interface FormData {
  firstName: string
  email: string
  inviter: string
}

interface Step2Props {
  formData: FormData
  setFormData: (data: FormData) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error: string
  onBack: () => void
}

export function Step2({ formData, setFormData, onSubmit, loading, error, onBack }: Step2Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Étape 2 : Demande d&apos;accès</h2>
        <p className="text-gray-400">
          Remplissez ce formulaire pour que l&apos;administrateur puisse valider votre accès.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
            Prénom
          </label>
          <input
            id="firstName"
            type="text"
            required
            autoFocus
            value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            placeholder="Votre prénom"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email Emby Connect
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            placeholder="L'email utilisé pour votre compte Emby"
          />
          <p className="text-xs text-gray-500 mt-1">C&apos;est l&apos;identifiant qui permettra de vous lier au serveur.</p>
        </div>

        <div>
          <label htmlFor="inviter" className="block text-sm font-medium text-gray-300 mb-1">
            Invité par
          </label>
          <input
            id="inviter"
            type="text"
            value={formData.inviter}
            onChange={e => setFormData({ ...formData, inviter: e.target.value })}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            placeholder="Qui vous a parlé de MediaHub ?"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all"
        >
          Retour
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
          Envoyer
        </button>
      </div>
    </form>
  )
}
