'use client'

import { ChevronRight, Server } from 'lucide-react'

interface Step1Props {
  onNext: () => void
}

export function Step1({ onNext }: Step1Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
          <Server className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Étape 1 : Créer un compte Emby Connect</h2>
        <p className="text-gray-400">
          Avant de demander l&apos;accès à MediaHub, vous devez posséder un compte Emby Connect. C&apos;est ce compte qui vous servira à vous connecter.
        </p>
      </div>

      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs">1</span>
          Rendez-vous sur Emby.media
        </h3>
        <p className="text-sm text-gray-400 pl-8">
          Allez sur le site{' '}
          <a href="https://emby.media/connect" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
            emby.media/connect
          </a>{' '}
          et cliquez sur &quot;Sign In&quot; puis &quot;Sign Up&quot;.
        </p>

        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-xs">2</span>
          Créez votre compte
        </h3>
        <p className="text-sm text-gray-400 pl-8">
          Remplissez le formulaire d&apos;inscription. <strong>Notez bien l&apos;adresse email utilisée</strong>, elle sera requise à l&apos;étape suivante.
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
        J&apos;ai créé mon compte Emby
        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  )
}
