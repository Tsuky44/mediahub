import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptData } from '@/lib/crypto'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
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
    const operations = config.settings.map((setting: any) => {
      return prisma.setting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          category: setting.category || setting.group || 'general',
        },
        create: {
          key: setting.key,
          value: setting.value,
          category: setting.category || setting.group || 'general',
        }
      })
    })

    await prisma.$transaction(operations)

    // Revalidate paths to reflect changes immediately
    revalidatePath('/')
    revalidatePath('/dashboard')
    revalidatePath('/api/settings') 

    return NextResponse.json({ success: true, count: operations.length })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
