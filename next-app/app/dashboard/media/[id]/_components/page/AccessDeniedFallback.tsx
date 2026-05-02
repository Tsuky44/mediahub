import Link from 'next/link'

export function AccessDeniedFallback() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-3xl font-bold text-white">Accès Refusé</h1>
      <p className="mb-8 text-gray-400">
        Vous n&apos;avez pas la permission de consulter ce contenu.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        Retour au tableau de bord
      </Link>
    </div>
  )
}
