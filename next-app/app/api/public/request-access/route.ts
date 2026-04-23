
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema validation for the request
const requestSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
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
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cette adresse email' },
        { status: 409 }
      )
    }

    // Check if a request already exists
    const existingRequest = await prisma.accountRequest.findUnique({
      where: { email }
    })

    if (existingRequest) {
        if (existingRequest.status === 'PENDING') {
            return NextResponse.json(
                { error: 'Une demande est déjà en cours pour cet email' },
                { status: 409 }
            )
        }
        // If rejected, we might allow re-submission or handle differently. 
        // For now, block if it exists regardless of status to avoid spam, 
        // or update it to PENDING if it was REJECTED? 
        // Let's assume unique email for requests for simplicity.
        return NextResponse.json(
            { error: 'Une demande existe déjà pour cet email' },
            { status: 409 }
        )
    }

    // Create the request
    const newRequest = await prisma.accountRequest.create({
      data: {
        firstName,
        email,
        inviter,
        status: 'PENDING'
      }
    })

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(null, 'ACCOUNT_REQUEST_CREATE', 'AccountRequest', newRequest.id, { email, firstName, inviter })

        const { ExternalNotificationService } = await import('@/lib/services/external-notification-service')
        await ExternalNotificationService.send('account_request', {
            title: 'Nouvelle demande de compte',
            message: `${firstName} (${email}) a demandé un accès à MediaHub.${inviter ? `\nInvité par : ${inviter}` : ''}`,
            data: { email, firstName, inviter }
        })
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

    const request = await prisma.accountRequest.findUnique({
        where: { email },
        select: { status: true }
    })

    return NextResponse.json({ 
        exists: !!request,
        status: request?.status 
    })
}
