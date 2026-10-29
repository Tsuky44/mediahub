import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageDockerState, defineAbilityFor } from '@/lib/ability'
import { DockerService } from '@/lib/services/docker'

export const dynamic = 'force-dynamic'

/** Force Unraid a reinterroger les registres pour recalculer les statuts. */
export async function POST() {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || !canManageDockerState(ability)) {
        return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const result = await DockerService.refreshUpdateStatuses()

    if (!result.success) {
        const message = result.error || 'Verification impossible'
        return NextResponse.json({ error: message, message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
