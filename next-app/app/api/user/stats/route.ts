import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { embyService } from '@/lib/services/emby'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const stats = await embyService.getServerStats(from, to)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to get user stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
