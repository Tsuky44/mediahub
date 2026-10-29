import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { defineAbilityFor } from '@/lib/ability'
import {
    createDockerGroup,
    listDockerGroups,
    OrganizerUnavailableError,
} from '@/lib/services/docker-groups'

export const dynamic = 'force-dynamic'

/**
 * Liste des groupes de conteneurs.
 *
 * Quand l'organizer Unraid n'est pas joignable, on répond 200 avec une liste
 * vide plutôt qu'une erreur : la page Docker reste utilisable sans groupes,
 * et `reason` permet d'expliquer la situation à l'utilisateur.
 */
export async function GET() {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || !ability.can('read', 'Docker')) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    try {
        const groups = await listDockerGroups()
        return NextResponse.json({ groups, available: true })
    } catch (error) {
        if (error instanceof OrganizerUnavailableError) {
            return NextResponse.json({ groups: [], available: false, reason: error.message })
        }

        console.error('[API] Erreur de lecture des groupes Docker:', error)
        const message = (error as Error).message || 'Erreur interne'
        return NextResponse.json({ error: message, message }, { status: 500 })
    }
}

/** Crée un groupe (dossier de premier niveau dans l'organizer Unraid). */
export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || !ability.can('manage_groups', 'Docker')) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const name = typeof body?.name === 'string' ? body.name.trim() : ''

        if (!name) {
            const message = 'Le nom du groupe est obligatoire'
            return NextResponse.json({ error: message, message }, { status: 400 })
        }

        await createDockerGroup(name)

        const groups = await listDockerGroups()
        return NextResponse.json({ groups })
    } catch (error) {
        const status = error instanceof OrganizerUnavailableError ? 503 : 500
        const message = (error as Error).message || 'Impossible de créer le groupe'

        if (status === 500) console.error('[API] Erreur de création de groupe Docker:', error)
        return NextResponse.json({ error: message, message }, { status })
    }
}
