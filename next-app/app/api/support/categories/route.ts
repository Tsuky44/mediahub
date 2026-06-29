import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { supportCategories, supportSubcategories } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getRealUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET - Public: list all categories with subcategories for the chatbot
export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const categories = await db.query.supportCategories.findMany({
      orderBy: asc(supportCategories.order),
      with: {
        subcategories: {
          orderBy: asc(supportSubcategories.order),
        },
      },
    })

    return NextResponse.json(categories)
  } catch (error) {
    logger.error('[SupportCategories] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Admin only: create a category
export async function POST(request: NextRequest) {
  try {
    const user = await getRealUser()
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      name: string
      description?: string
      discordWebhook?: string
      discordMentions?: string
      order?: number
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const result = await db.insert(supportCategories).values({
      name: body.name.trim(),
      description: body.description?.trim() || null,
      discordWebhook: body.discordWebhook?.trim() || null,
      discordMentions: body.discordMentions?.trim() || null,
      order: body.order ?? 0,
    }).returning()

    return NextResponse.json(result[0])
  } catch (error) {
    logger.error('[SupportCategories] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Admin only: update a category
export async function PATCH(request: NextRequest) {
  try {
    const user = await getRealUser()
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      id: string
      name?: string
      description?: string
      discordWebhook?: string | null
      discordMentions?: string | null
      order?: number
    }

    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.discordWebhook !== undefined) updateData.discordWebhook = body.discordWebhook?.trim() || null
    if (body.discordMentions !== undefined) updateData.discordMentions = body.discordMentions?.trim() || null
    if (body.order !== undefined) updateData.order = body.order

    const result = await db.update(supportCategories)
      .set(updateData)
      .where(eq(supportCategories.id, body.id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    logger.error('[SupportCategories] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Admin only: delete a category
export async function DELETE(request: NextRequest) {
  try {
    const user = await getRealUser()
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    await db.delete(supportCategories).where(eq(supportCategories.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[SupportCategories] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
