import Link from 'next/link'

interface ExternalMediaFallbackProps {
  providerName: string
  itemName?: string | null
  id: string
}

export function ExternalMediaFallback({ providerName, itemName, id }: ExternalMediaFallbackProps) {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-3xl font-bold text-white">Média Introuvable</h1>
      <p className="mb-8 text-gray-400">
        Ce média ({providerName}) n&apos;est pas lié à une base de données publique (TMDB) et ne possède pas de page de détails.
        <br />
        {itemName ? `Nom: ${itemName}` : `ID: ${id}`}
      </p>
      <Link
        href="/dashboard/stats"
        className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        Retour aux statistiques
      </Link>
    </div>
  )
}
