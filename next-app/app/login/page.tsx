import { Metadata } from 'next'
import LoginForm from './LoginForm'
import { Suspense } from 'react'
import { getTmdbServiceForUser } from '@/lib/auth'
import BackgroundSlideshow from './BackgroundSlideshow'
import Image from 'next/image'
import { isAppConfigured } from '@/lib/setup'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Connexion - MediaHub',
  description: 'Connectez-vous à votre compte MediaHub',
}

export default async function LoginPage() {
  // Check if setup is required
  const configured = await isAppConfigured()
  if (!configured) {
    redirect('/setup')
  }

  // Fetch enabled auth providers
  const embyEnabled = await db.query.settings.findFirst({ where: eq(settings.key, 'auth_emby_enabled'), columns: { value: true } })
  const plexEnabled = await db.query.settings.findFirst({ where: eq(settings.key, 'auth_plex_enabled'), columns: { value: true } })
  const jellyfinEnabled = await db.query.settings.findFirst({ where: eq(settings.key, 'auth_jellyfin_enabled'), columns: { value: true } })
  const localEnabled = await db.query.settings.findFirst({ where: eq(settings.key, 'auth_local_enabled'), columns: { value: true } })

  const enabledProviders = {
    emby: embyEnabled ? embyEnabled.value === 'true' : true, // Default true
    plex: plexEnabled ? plexEnabled.value === 'true' : false, // Default false
    jellyfin: jellyfinEnabled ? jellyfinEnabled.value === 'true' : false, // Default false
    local: localEnabled ? localEnabled.value === 'true' : true // Default true for local
  }

  let backdrops: string[] = []
  
  try {
    // Fetch trending movies and TV shows from TMDB for high quality backdrops
    // Note: This might fail if no global TMDB key is set yet, or if it requires a user context.
    // Ideally we should have a public getTmdbService or similar, but for now we try.
    const tmdbService = await getTmdbServiceForUser()
    
    if (tmdbService) {
        const trending = await tmdbService.getTrending('all', 1)
        const items = trending?.results || []
        
        backdrops = items
          .filter((item: any) => item.backdrop_path)
          .map((item: any) => `https://image.tmdb.org/t/p/original${item.backdrop_path}`)
          .slice(0, 15)
    }
  } catch (error) {
    console.error('[LoginPage] Error fetching backdrops:', error)
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
            <LoginForm enabledProviders={enabledProviders} />
          </Suspense>
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-500">
          MediaHub - Gestionnaire de médias unifié
        </p>
      </div>
    </div>
  )
}
