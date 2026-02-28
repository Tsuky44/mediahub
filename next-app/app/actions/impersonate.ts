'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getRealUser } from '@/lib/auth'

export async function startImpersonation(roleId: string) {
  const user = await getRealUser()
  
  // Security check: Only admins can impersonate
  if (!user || (user as any).role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const cookieStore = await cookies()
  cookieStore.set('mediahub_impersonate', roleId, {
    path: '/',
    httpOnly: true, // Prevents client-side JS from modifying it, but we can still read it via server
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })

  revalidatePath('/')
}

export async function stopImpersonation() {
  const cookieStore = await cookies()
  cookieStore.delete('mediahub_impersonate')
  revalidatePath('/')
}
