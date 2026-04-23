'use client'

import { Eye, X } from "lucide-react"
import { stopImpersonation } from "@/app/actions/impersonate"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

interface Props {
  roleName: string
}

export function ImpersonationBannerClient({ roleName }: Props) {
  const router = useRouter()

  const handleStop = async () => {
    try {
      await stopImpersonation()
      toast.success("Mode aperçu désactivé")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la désactivation")
    }
  }

  return (
    <div className="bg-indigo-600 text-white px-4 py-2 shadow-lg flex items-center justify-between animate-in slide-in-from-top duration-300 w-full">
      <div className="flex items-center gap-3 container mx-auto max-w-7xl">
        <div className="p-1.5 bg-white/20 rounded-lg animate-pulse">
            <Eye className="w-5 h-5" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-bold">Mode Aperçu Actif</span>
            <span className="hidden sm:inline text-indigo-200">|</span>
            <span className="text-indigo-100 text-sm">
                Vous naviguez en tant que : <span className="font-mono bg-indigo-700 px-2 py-0.5 rounded text-white font-bold">{roleName}</span>
            </span>
        </div>
      </div>
      
      <button 
        onClick={handleStop}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium ml-4 whitespace-nowrap"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Quitter l'aperçu</span>
      </button>
    </div>
  )
}
