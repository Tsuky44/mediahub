import { NextRequest, NextResponse } from 'next/server'
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { logger } from '@/lib/logger'

function resolveDbPath(): string {
  const explicit = process.env.MEDIAHUB_DB_PATH
  if (explicit) return resolve(explicit)
  const databaseUrl = process.env.DATABASE_URL || 'file:./data/db/dev.db'
  const rawPath = databaseUrl.replace(/^file:/, '')
  return resolve(rawPath.startsWith('/') || rawPath.includes(':') ? rawPath : `./${rawPath}`)
}

function getUploadDir(): string {
  const dbDir = dirname(resolveDbPath())
  const uploadDir = join(dbDir, 'support-uploads')
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }
  return uploadDir
}

// POST — Upload an image
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images allowed.' }, { status: 400 })
    }

    // Validate size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
    }

    const ext = file.type.split('/')[1] || 'png'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
    const uploadDir = getUploadDir()
    const filePath = join(uploadDir, fileName)

    const buffer = Buffer.from(await file.arrayBuffer())
    writeFileSync(filePath, buffer)

    const url = `/api/support/upload?file=${encodeURIComponent(fileName)}`

    return NextResponse.json({ url })
  } catch (error) {
    logger.error('[SupportUpload] POST error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// GET — Serve an uploaded file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file')

    if (!fileName) {
      return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 })
    }

    // Prevent directory traversal
    const uploadDir = getUploadDir()
    const filePath = join(uploadDir, fileName)
    if (!filePath.startsWith(uploadDir)) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = readFileSync(filePath)

    // Infer content type from extension
    const ext = fileName.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream'

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    logger.error('[SupportUpload] GET error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
