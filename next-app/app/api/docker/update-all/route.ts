import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageDockerState, defineAbilityFor } from '@/lib/ability'
import { DockerService } from '@/lib/services/docker'

export const dynamic = 'force-dynamic'

/** Met à jour d'un coup tous les conteneurs signalés comme obsolètes. */
export async function POST() {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || !canManageDockerState(ability)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const result = await DockerService.updateAllContainers()

    if (!result.success) {
        const message = result.error || 'Mise à jour globale impossible'
        return NextResponse.json({ error: message, message }, { status: 500 })
    }

    try {
        const { logAction } = await import('@/lib/audit')
        await logAction(parseInt(user.id), 'DOCKER_ACTION', 'Docker', 'all', {
            action: 'update-all',
            count: result.count,
        })
    } catch (auditErr) {
        console.error("[API] Échec de journalisation de la mise à jour globale:", auditErr)
    }

    return NextResponse.json({ success: true, count: result.count ?? 0 })
}
