import { Metadata } from 'next'
import SetupForm from './SetupForm'
import Image from 'next/image'
import { isAppConfigured } from '@/lib/setup'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Installation - MediaHub',
  description: 'Configuration initiale de MediaHub',
}

export default async function SetupPage() {
  const configured = await isAppConfigured()
  if (configured) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Simple Background for setup */}
      <div className="absolute inset-0 z-0">
         <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-black to-black z-0" />
      </div>

      <div className="relative z-10 w-full max-w-2xl px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6">
            <Image 
              src="/logo.png" 
              alt="MediaHub Logo" 
              width={96} 
              height={96}
              className="drop-shadow-2xl object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            Bienvenue sur MediaHub
          </h1>
          <p className="text-gray-400 font-medium">Configuration initiale du serveur</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
           <SetupForm />
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-500">
          MediaHub - Gestionnaire de médias unifié
        </p>
      </div>
    </div>
  )
}
