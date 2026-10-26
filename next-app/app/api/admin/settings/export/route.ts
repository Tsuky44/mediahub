import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db/drizzle'
import { settings } from '@/lib/db/schema'
import { encryptData } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    const user = session?.user as any

    if (!session || user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json({ error: 'Password is required for encryption' }, { status: 400 })
    }

    // Fetch all settings
    const settingsList = await db.query.settings.findMany({
      columns: {
        key: true,
        value: true,
        category: true
      }
    })

    const configData = JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: settingsList
    })

    // Encrypt
    const encryptedData = await encryptData(configData, password)

    // Return as a downloadable file content
    return new NextResponse(encryptedData, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="mediahub-config-${new Date().toISOString().split('T')[0]}.enc"`
      }
    })

  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
