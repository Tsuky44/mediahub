import { Metadata } from 'next'
import LoginForm from './LoginForm'
import { Suspense } from 'react'
import { getTmdbServiceForUser } from '@/lib/auth'
import BackgroundSlideshow from './BackgroundSlideshow'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Connexion - MediaHub',
  description: 'Connectez-vous à votre compte MediaHub',
}

export default async function LoginPage() {
  // Fetch trending movies and TV shows from TMDB for high quality backdrops
  const tmdbService = await getTmdbServiceForUser()
  const items = tmdbService ? (await tmdbService.getTrending('all', 1)).results || [] : []
  
  const backdrops = items
    .filter((item: any) => item.backdrop_path)
    .map((item: any) => `https://image.tmdb.org/t/p/original${item.backdrop_path}`)
    .slice(0, 15)

  if (backdrops.length === 0) {
    console.warn('[LoginPage] No backdrops found from TMDB trending')
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background Slideshow & Overlays */}
      <div className="absolute inset-0 z-0">
        <BackgroundSlideshow images={backdrops} />
        {/* Voile noir équilibré */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-10" />
        {/* Dégradé plus doux */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40 z-20" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-40 h-40 mb-6 transition-transform duration-500 hover:scale-110">
            <Image 
              src="/logo.png" 
              alt="MediaHub Logo" 
              width={160} 
              height={160}
              className="drop-shadow-2xl object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            MediaHub
          </h1>
          <p className="text-gray-400 font-medium">Connectez-vous pour commencer à regarder</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <Suspense fallback={
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-500">
          Propulsé par Emby & MediaHub
        </p>
      </div>
    </div>
  )
}

