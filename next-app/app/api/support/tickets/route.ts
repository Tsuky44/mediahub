import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { supportTickets, supportCategories, supportSubcategories, users } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { getCurrentUser, getRealUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { sendDiscordWebhook, buildTicketEmbed } from '@/lib/services/support-discord'
import { getSetting } from '@/lib/settings'
import { createTicketNotification } from '@/lib/notifications/internal'

// GET - Admin only: list all tickets with optional filters
export async function GET(request: NextRequest) {
  try {
    const user = await getRealUser()
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const categoryId = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let conditions = undefined
    const filters = []
    if (status) filters.push(eq(supportTickets.status, status))
    if (categoryId) filters.push(eq(supportTickets.categoryId, categoryId))
    if (filters.length > 0) conditions = and(...filters)

    const tickets = await db.query.supportTickets.findMany({
      where: conditions,
      with: {
        category: true,
        subcategory: true,
        user: { columns: { name: true, email: true } },
      },
      orderBy: desc(supportTickets.createdAt),
      limit,
      offset,
    })

    return NextResponse.json(tickets)
  } catch (error) {
    logger.error('[SupportTickets] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Authenticated or anonymous: create a ticket
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    const body = await request.json() as {
      categoryId: string
      subcategoryId?: string
      message: string
      userName?: string
      userEmail?: string
      attachments?: string[]
    }

    if (!body.categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
    }

    const hasAttachments = body.attachments && body.attachments.length > 0
    if (!body.message?.trim() && !hasAttachments) {
      return NextResponse.json({ error: 'message or attachments are required' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    // Verify category exists
    const category = await db.query.supportCategories.findFirst({
      where: eq(supportCategories.id, body.categoryId),
    })
    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Verify subcategory exists if provided
    if (body.subcategoryId) {
      const subcategory = await db.query.supportSubcategories.findFirst({
        where: eq(supportSubcategories.id, body.subcategoryId),
      })
      if (!subcategory) {
        return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 })
      }
    }

    const userId = user ? parseInt((user as any).id) : null
    const userName = user ? (user as any).name : (body.userName?.trim() || null)
    const userEmail = user ? (user as any).email : (body.userEmail?.trim() || null)

    const result = await db.insert(supportTickets).values({
      userId,
      userName,
      userEmail,
      categoryId: body.categoryId,
      subcategoryId: body.subcategoryId || null,
      message: body.message?.trim() || '(Pièce(s) jointe(s) sans message texte)',
      attachments: hasAttachments ? JSON.stringify(body.attachments) : null,
      status: 'open',
    }).returning()

    const ticket = result[0]

    // Send Discord notification
    try {
      const baseUrl = await getSetting('app_url', 'http://localhost:3000')

      // Determine webhook: subcategory webhook > category webhook > global setting
      let webhookUrl: string | null = null

      if (body.subcategoryId) {
        const sub = await db.query.supportSubcategories.findFirst({
          where: eq(supportSubcategories.id, body.subcategoryId),
        })
        if (sub?.discordWebhook) webhookUrl = sub.discordWebhook
      }

      if (!webhookUrl && category.discordWebhook) {
        webhookUrl = category.discordWebhook
      }

      if (!webhookUrl) {
        const globalWebhook = await getSetting('support_discord_webhook', '')
        if (globalWebhook) webhookUrl = globalWebhook
      }

      if (webhookUrl) {
        const subcategory = body.subcategoryId
          ? await db.query.supportSubcategories.findFirst({
              where: eq(supportSubcategories.id, body.subcategoryId),
            })
          : null

        // Mentions priority: subcategory > category
        const mentions = subcategory?.discordMentions || category.discordMentions || null

        const payload = buildTicketEmbed(
          ticket.id,
          category.name,
          subcategory?.name || null,
          body.message.trim(),
          userName,
          userEmail,
          'open',
          baseUrl,
          body.attachments,
          mentions
        )

        await sendDiscordWebhook(webhookUrl, payload)
      }
    } catch (discordError) {
      logger.error('[SupportTickets] Discord send failed:', discordError)
      // Non-blocking: ticket is still created
    }

    // Internal notification for admins
    try {
      await createTicketNotification(ticket.id, category.name, userName)
    } catch (notifError) {
      logger.error('[SupportTickets] Internal notification failed:', notifError)
    }

    return NextResponse.json(ticket)
  } catch (error) {
    logger.error('[SupportTickets] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
