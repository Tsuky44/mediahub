'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Settings Page Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-8">
      <h2 className="text-2xl font-bold text-red-500">Erreur de chargement</h2>
      <p className="text-gray-400 text-center max-w-lg">
        Une erreur est survenue lors de l'affichage de cette page.
      </p>
      <div className="bg-black/30 p-4 rounded-lg text-sm font-mono text-gray-300 w-full overflow-auto max-h-60">
        <p className="font-bold mb-2">Message:</p>
        {error.message || JSON.stringify(error)}
        {error.digest && (
          <div className="mt-2 text-xs text-gray-500 border-t border-gray-700 pt-2">
            Digest: {error.digest}
          </div>
        )}
      </div>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
