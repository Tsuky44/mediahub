import { Metadata } from 'next'
import LoginForm from './LoginForm'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Connexion - MediaHub',
  description: 'Connectez-vous à votre compte MediaHub',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-900 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
          Connectez-vous à votre compte
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 px-4 py-8 shadow sm:rounded-lg sm:px-10 border border-gray-700">
          <Suspense fallback={
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
