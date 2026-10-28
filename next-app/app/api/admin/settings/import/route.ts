import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { decryptData } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const user = session?.user as any

    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, password } = await request.json()

    if (!data || !password) {
      return NextResponse.json({ error: 'Data and password are required' }, { status: 400 })
    }

    // Decrypt
    let decryptedJson: string
    try {
      decryptedJson = await decryptData(data, password)
    } catch (e) {
      return NextResponse.json({ error: 'Decryption failed. Invalid password or corrupted file.' }, { status: 400 })
    }

    const config = JSON.parse(decryptedJson)

    if (!config.settings || !Array.isArray(config.settings)) {
      return NextResponse.json({ error: 'Invalid configuration file format' }, { status: 400 })
    }

    // Upsert settings
    let count = 0
    for (const setting of config.settings) {
      const existing = await db.query.settings.findFirst({
        where: eq(settings.key, setting.key)
      })
      
      if (existing) {
        await db.update(settings)
          .set({
            value: setting.value,
            category: setting.category || setting.group || 'general',
            updatedAt: new Date()
          })
          .where(eq(settings.key, setting.key))
      } else {
        await db.insert(settings).values({
          key: setting.key,
          value: setting.value,
          category: setting.category || setting.group || 'general',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      count++
    }

    // Revalidate paths to reflect changes immediately
    revalidatePath('/')
    revalidatePath('/dashboard')
    revalidatePath('/api/settings') 

    return NextResponse.json({ success: true, count })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
