'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import Link from 'next/link'

interface Step3Props {
  email: string
}

export function Step3({ email }: Step3Props) {
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
          Votre demande a bien été enregistrée. L&apos;administrateur va l&apos;examiner prochainement.
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-2">Que faire maintenant ?</h3>
        <p className="text-sm text-gray-400">
          Vous pouvez essayer de vous connecter avec votre email <strong>{email}</strong>. Tant que votre compte n&apos;est pas validé, vous verrez un message &quot;En attente de création&quot;.
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
