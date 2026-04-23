import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAppConfigured } from '@/lib/setup'
import { revalidatePath } from 'next/cache'

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
    const { emby_url, emby_api_key } = body

    if (!emby_url || !emby_api_key) {
      return NextResponse.json(
        { error: 'Veuillez remplir les champs obligatoires (URL Emby et Clé API)' },
        { status: 400 }
      )
    }

    // Create Settings
    await prisma.setting.createMany({
      data: [
        { key: 'emby_url', value: emby_url, category: 'emby' },
        { key: 'emby_api_key', value: emby_api_key, category: 'emby' }
      ]
    })

    revalidatePath('/')
    revalidatePath('/setup')
    revalidatePath('/login')

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Une erreur est survenue lors de l\'installation' },
      { status: 500 }
    )
  }
}
