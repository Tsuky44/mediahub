import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/drizzle'
import { supportSubcategories } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getRealUser } from '@/lib/auth'
import { logger } from '@/lib/logger'

// GET - Public: list subcategories for a category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    if (categoryId) {
      const subcategories = await db.query.supportSubcategories.findMany({
        where: eq(supportSubcategories.categoryId, categoryId),
        orderBy: asc(supportSubcategories.order),
      })
      return NextResponse.json(subcategories)
    }

    const all = await db.query.supportSubcategories.findMany({
      orderBy: asc(supportSubcategories.order),
    })
    return NextResponse.json(all)
  } catch (error) {
    logger.error('[SupportSubcategories] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Admin only: create a subcategory
export async function POST(request: NextRequest) {
  try {
    const user = await getRealUser()
    if (!user || (user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      categoryId: string
      name: string
      description?: string
      discordWebhook?: string
      discordMentions?: string
      order?: number
    }

    if (!body.categoryId || !body.name?.trim()) {
      return NextResponse.json({ error: 'categoryId and name are required' }, { status: 400 })
    }

    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }

    const result = await db.insert(supportSubcategories).values({
      categoryId: body.categoryId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      discordWebhook: body.discordWebhook?.trim() || null,
      discordMentions: body.discordMentions?.trim() || null,
      order: body.order ?? 0,
    }).returning()

    return NextResponse.json(result[0])
  } catch (error) {
    logger.error('[SupportSubcategories] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Admin only: update a subcategory
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

    const result = await db.update(supportSubcategories)
      .set(updateData)
      .where(eq(supportSubcategories.id, body.id))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    logger.error('[SupportSubcategories] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Admin only: delete a subcategory
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

    await db.delete(supportSubcategories).where(eq(supportSubcategories.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[SupportSubcategories] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
