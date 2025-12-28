'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        redirect: false,
        username,
        password,
      })

      if (result?.error) {
        setError('Nom d\'utilisateur ou mot de passe incorrect')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md bg-red-900/50 p-4 border border-red-900">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-200">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-200">
          Nom d'utilisateur Emby
        </label>
        <div className="mt-1">
          <input
            id="username"
            name="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-200">
          Mot de passe
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full rounded-md border-gray-600 bg-gray-700 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Se connecter
        </button>
      </div>
    </form>
  )
}
