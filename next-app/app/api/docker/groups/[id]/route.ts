import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import {
    deleteDockerGroup,
    listDockerGroups,
    OrganizerUnavailableError,
    renameDockerGroup,
    setDockerGroupMembers,
} from '@/lib/services/docker-groups'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

async function authorize() {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    return !!session && ability.can('manage_groups', 'Docker')
}

function failure(error: unknown, fallback: string) {
    const status = error instanceof OrganizerUnavailableError ? 503 : 500
    const message = (error as Error).message || fallback

    if (status === 500) console.error(`[API] ${fallback}:`, error)
    return NextResponse.json({ error: message, message }, { status })
}

/**
 * Met à jour un groupe : son nom (`name`) et/ou ses membres (`members`, une
 * liste de noms de conteneurs). Les deux peuvent arriver séparément — le
 * gestionnaire de groupes renomme, le glisser-déposer déplace.
 */
export async function PUT(request: Request, { params }: RouteContext) {
    if (!(await authorize())) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    try {
        const body = await request.json()

        if (Array.isArray(body?.members)) {
            const containerNames = body.members.filter((m: unknown): m is string => typeof m === 'string')
            await setDockerGroupMembers(id, containerNames)
        }

        if (typeof body?.name === 'string') {
            const name = body.name.trim()
            if (!name) {
                const message = 'Le nom du groupe ne peut pas être vide'
                return NextResponse.json({ error: message, message }, { status: 400 })
            }
            await renameDockerGroup(id, name)
        }

        const groups = await listDockerGroups()
        return NextResponse.json({ groups })
    } catch (error) {
        return failure(error, 'Impossible de mettre à jour le groupe')
    }
}

/** Supprime le groupe. Ses conteneurs remontent à la racine. */
export async function DELETE(_request: Request, { params }: RouteContext) {
    if (!(await authorize())) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    try {
        await deleteDockerGroup(id)

        const groups = await listDockerGroups()
        return NextResponse.json({ groups })
    } catch (error) {
        return failure(error, 'Impossible de supprimer le groupe')
    }
}
