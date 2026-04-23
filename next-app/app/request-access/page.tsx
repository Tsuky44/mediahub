'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, UserPlus, Server, Send, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Define types for props
interface FormData {
  firstName: string
  email: string
  inviter: string
}

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
          <Server className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Étape 1 : Créer un compte Emby Connect</h2>
        <p className="text-gray-400">
          Avant de demander l'accès à MediaHub, vous devez posséder un compte Emby Connect. C'est ce compte qui vous servira à vous connecter.
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs">1</span>
          Rendez-vous sur Emby.media
        </h3>
        <p className="text-sm text-gray-400 pl-8">
          Allez sur le site <a href="https://emby.media/connect" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">emby.media/connect</a> et cliquez sur "Sign In" puis "Sign Up".
        </p>

        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs">2</span>
          Créez votre compte
        </h3>
        <p className="text-sm text-gray-400 pl-8">
          Remplissez le formulaire d'inscription. <strong>Notez bien l'adresse email utilisée</strong>, elle sera requise à l'étape suivante.
        </p>

        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs">3</span>
          Validez votre email
        </h3>
        <p className="text-sm text-gray-400 pl-8">
          Cliquez sur le lien de validation reçu par email pour activer votre compte Emby Connect.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 group"
      >
        J'ai créé mon compte Emby
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}

function Step2({ 
  formData, 
  setFormData, 
  onSubmit, 
  loading, 
  error, 
  onBack 
}: { 
  formData: FormData
  setFormData: (data: FormData) => void
  onSubmit: (e: React.FormEvent) => void
  loading: boolean
  error: string
  onBack: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
          <UserPlus className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Étape 2 : Demande d'accès</h2>
        <p className="text-gray-400">
          Remplissez ce formulaire pour que l'administrateur puisse valider votre accès.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">Prénom</label>
          <input
            id="firstName"
            type="text"
            required
            autoFocus
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            placeholder="Votre prénom"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Emby Connect</label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            placeholder="L'email utilisé pour votre compte Emby"
          />
          <p className="text-xs text-gray-500 mt-1">C'est l'identifiant qui permettra de vous lier au serveur.</p>
        </div>

        <div>
          <label htmlFor="inviter" className="block text-sm font-medium text-gray-300 mb-1">Invité par</label>
          <input
            id="inviter"
            type="text"
            value={formData.inviter}
            onChange={(e) => setFormData({ ...formData, inviter: e.target.value })}
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

function Step3({ email }: { email: string }) {
  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"
      >
        <Check className="w-10 h-10 text-green-400" />
      </motion.div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Demande envoyée !</h2>
        <p className="text-gray-400 max-w-sm mx-auto">
          Votre demande a bien été enregistrée. L'administrateur va l'examiner prochainement.
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">Que faire maintenant ?</h3>
        <p className="text-sm text-gray-400">
          Vous pouvez essayer de vous connecter avec votre email <strong>{email}</strong>. 
          Tant que votre compte n'est pas validé, vous verrez un message "En attente de création".
        </p>
      </div>

      <Link
        href="/login"
        className="inline-flex items-center justify-center py-3 px-8 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all"
      >
        Retour à la connexion
      </Link>
    </div>
  )
}

export default function RequestAccessPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    email: '',
    inviter: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleNext = () => {
    setStep(step + 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/public/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue')
      }

      setSuccess(true)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-purple-900/20" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && <Step1 onNext={handleNext} />}
              
              {step === 2 && (
                <Step2 
                  formData={formData} 
                  setFormData={setFormData}
                  onSubmit={handleSubmit}
                  loading={loading}
                  error={error}
                  onBack={() => setStep(1)}
                />
              )}

              {step === 3 && <Step3 email={formData.email} />}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-500">
          MediaHub &bull; Accès Sécurisé
        </p>
      </div>
    </div>
  )
}
