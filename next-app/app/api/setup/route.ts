import { NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { isAppConfigured } from '@/lib/setup'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const configured = await isAppConfigured()
    if (configured) {
      return NextResponse.json(
        { error: 'L\'application est déjà configurée' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { server_type, emby_url, emby_api_key, jellyfin_url, jellyfin_api_key } = body

    const now = new Date()
    const settingsToInsert: { key: string; value: string; category: string; createdAt: Date; updatedAt: Date }[] = [
      { key: 'setup_complete', value: 'true', category: 'general', createdAt: now, updatedAt: now },
    ]

    if (server_type === 'jellyfin') {
      if (!jellyfin_url || !jellyfin_api_key) {
        return NextResponse.json(
          { error: 'Veuillez remplir les champs obligatoires (URL Jellyfin et Clé API)' },
          { status: 400 }
        )
      }
      settingsToInsert.push(
        { key: 'jellyfin_url', value: jellyfin_url, category: 'jellyfin', createdAt: now, updatedAt: now },
        { key: 'jellyfin_api_key', value: jellyfin_api_key, category: 'jellyfin', createdAt: now, updatedAt: now },
        { key: 'auth_jellyfin_enabled', value: 'true', category: 'auth', createdAt: now, updatedAt: now },
        { key: 'auth_emby_enabled', value: 'false', category: 'auth', createdAt: now, updatedAt: now },
        { key: 'auth_local_enabled', value: 'false', category: 'auth', createdAt: now, updatedAt: now },
      )
    } else {
      if (!emby_url || !emby_api_key) {
        return NextResponse.json(
          { error: 'Veuillez remplir les champs obligatoires (URL Emby et Clé API)' },
          { status: 400 }
        )
      }
      settingsToInsert.push(
        { key: 'emby_url', value: emby_url, category: 'emby', createdAt: now, updatedAt: now },
        { key: 'emby_api_key', value: emby_api_key, category: 'emby', createdAt: now, updatedAt: now },
        { key: 'auth_emby_enabled', value: 'true', category: 'auth', createdAt: now, updatedAt: now },
        { key: 'auth_jellyfin_enabled', value: 'false', category: 'auth', createdAt: now, updatedAt: now },
        { key: 'auth_local_enabled', value: 'false', category: 'auth', createdAt: now, updatedAt: now },
      )
    }

    // Create Settings
    await db.insert(settings).values(settingsToInsert)

    revalidatePath('/')
    revalidatePath('/setup')
    revalidatePath('/login')

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Une erreur est survenue lors de l\'installation' },
      { status: 500 }
    )
  }
}
