import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-white">
      <h2 className="text-3xl font-bold">404 - Page non trouvée</h2>
      <p className="mt-4 text-gray-400">La page que vous recherchez n'existe pas.</p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
