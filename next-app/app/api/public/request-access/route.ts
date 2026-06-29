﻿﻿﻿﻿﻿
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { users, accountRequests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Schema validation for the request
const requestSchema = z.object({
  firstName: z.string().min(2, 'Le prÃ©nom doit contenir au moins 2 caractÃ¨res'),
  email: z.string().email('Email invalide'),
  inviter: z.string().optional()
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate input
    const validation = requestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { firstName, email, inviter } = validation.data

    // Check if user already exists in MediaHub (User table)
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1)

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe dÃ©jÃ  avec cette adresse email' },
        { status: 409 }
      )
    }

    // Check if a request already exists
    const [existingRequest] = await db.select().from(accountRequests).where(eq(accountRequests.email, email)).limit(1)

    if (existingRequest) {
        if (existingRequest.status === 'PENDING') {
            return NextResponse.json(
                { error: 'Une demande est dÃ©jÃ  en cours pour cet email' },
                { status: 409 }
            )
        }
        // If rejected, we might allow re-submission or handle differently. 
        // For now, block if it exists regardless of status to avoid spam, 
        // or update it to PENDING if it was REJECTED? 
        // Let's assume unique email for requests for simplicity.
        return NextResponse.json(
            { error: 'Une demande existe dÃ©jÃ  pour cet email' },
            { status: 409 }
        )
    }

    // Create the request
    const [newRequest] = await db.insert(accountRequests).values({
      firstName,
      email,
      inviter: inviter || null,
      status: 'PENDING'
    }).returning()

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(null, 'ACCOUNT_REQUEST_CREATE', 'AccountRequest', newRequest.id, { email, firstName, inviter })

        // V1 notifications supprimées - plus d'envoi de notifications externes
        console.log(`[RequestAccess] Account request from ${firstName} (${email}) - V1 notifications removed`)
    } catch (e) {
        console.error('Failed to log or notify account request creation:', e)
    }

    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('[Account Request] Error:', error)
    return NextResponse.json(
      { error: 'Une erreur interne est survenue' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
        return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const [request] = await db.select({ status: accountRequests.status }).from(accountRequests).where(eq(accountRequests.email, email)).limit(1)

    return NextResponse.json({ 
        exists: !!request,
        status: request?.status 
    })
}
