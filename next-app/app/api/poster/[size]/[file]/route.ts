import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createMemoCache } from '@/lib/cache'
import { removePosterFrame } from '@/lib/poster-frame'

/**
 * Affiche TMDB sans le cadre clair imprimé dans certaines images (lib/poster-frame.ts). Une
 * affiche sans cadre est renvoyée telle quelle. Si TMDB ne répond pas, renvoi vers l'image
 * d'origine.
 */

const SIZES = new Set(['w92', 'w154', 'w185', 'w342', 'w500', 'w780', 'original'])
const FILE = /^[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$/
// TMDB_IMAGE_BASE : tests seulement (serveur d'images local)
const TMDB = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p'

// ~25 Ko par affiche : 600 affiches, ~15 Mo
const posters = createMemoCache({ max: 600, ttl: 24 * 60 * 60 * 1000 })

type Context = { params: Promise<{ size: string; file: string }> }

export async function GET(_request: Request, context: Context) {
  const { size, file } = await context.params
  if (!SIZES.has(size) || !FILE.test(file)) return new NextResponse(null, { status: 404 })
  // Réservé aux utilisateurs connectés : pas un relais d'images ouvert à tous
  const session = await getSession()
  if (!session?.user) return new NextResponse(null, { status: 401 })

  const source = `${TMDB}/${size}/${file}`
  try {
    const poster = await posters.get(`${size}/${file}`, async () => {
      const res = await fetch(source, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const original = Buffer.from(await res.arrayBuffer())
      const fixed = await removePosterFrame(original).catch(() => null)
      return fixed
        ? { body: fixed, type: 'image/jpeg' }
        : { body: original, type: res.headers.get('content-type') || 'image/jpeg' }
    })
    return new NextResponse(new Uint8Array(poster.body), {
      headers: {
        'Content-Type': poster.type,
        // Une affiche TMDB ne change jamais à adresse égale
        'Cache-Control': 'public, max-age=2592000, immutable',
      },
    })
  } catch {
    return NextResponse.redirect(source, 307)
  }
}
