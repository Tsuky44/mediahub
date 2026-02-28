
import { cookies } from 'next/headers'
import { stopImpersonation } from '@/app/actions/impersonate'
import { AlertTriangle, X } from 'lucide-react'

export async function ImpersonationBanner() {
  const cookieStore = await cookies()
  const impersonateId = cookieStore.get('mediahub_impersonate')?.value

  if (!impersonateId) return null

  return (
    <div className="bg-orange-600 text-white px-4 py-2 flex items-center justify-between shadow-lg relative z-[100]">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-bold">Mode Aperçu Activé</span>
        <span className="text-sm opacity-90 hidden sm:inline"> - Vous naviguez en tant qu'un autre rôle</span>
      </div>
      <form action={stopImpersonation}>
        <button 
          type="submit"
          className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Quitter le mode aperçu
        </button>
      </form>
    </div>
  )
}
