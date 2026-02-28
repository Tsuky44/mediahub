import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { logAction } from '@/lib/audit'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = (session.user as any).role === 'admin'

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const groups = await (prisma as any).userGroup.findMany({
            include: {
                members: true
            },
            orderBy: {
                name: 'asc'
            }
        })

        return NextResponse.json(groups)
    } catch (error) {
        console.error('[UserGroups] Error fetching groups:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canManage = (session.user as any).role === 'admin'

    if (!canManage) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const { name } = await req.json()

        if (!name) {
            return new NextResponse('Name is required', { status: 400 })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const group = await (prisma as any).userGroup.create({
            data: {
                name
            }
        })

        await logAction(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parseInt((session.user as any).id),
            'CREATE',
            'UserGroup',
            group.id,
            { name }
        )

        return NextResponse.json(group)
    } catch (error) {
        console.error('[UserGroups] Error creating group:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
