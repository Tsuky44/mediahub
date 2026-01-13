import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const groups = await (prisma as any).userGroup.findMany({
            include: {
                members: {
                    include: {
                        instance: {
                            select: {
                                name: true,
                                type: true
                            }
                        }
                    }
                }
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
    if (!session || (session.user as any).role !== 'admin') {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const { name } = await req.json()

        if (!name) {
            return new NextResponse('Name is required', { status: 400 })
        }

        const group = await (prisma as any).userGroup.create({
            data: {
                name
            }
        })

        return NextResponse.json(group)
    } catch (error) {
        console.error('[UserGroups] Error creating group:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
