import { NextResponse } from 'next/server'
import { getMediaServerType } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const serverType = await getMediaServerType()
  return NextResponse.json({ serverType: serverType || 'emby' })
}
