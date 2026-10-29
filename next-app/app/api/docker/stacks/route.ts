import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageDockerState, defineAbilityFor } from '@/lib/ability'
import { applyStackAction, listDockerStacks, redeployStack } from '@/lib/services/docker-stacks'
import { ComposeFilesUnavailableError } from '@/lib/services/docker-compose-files'

export const dynamic = 'force-dynamic'

const LIFECYCLE = ['start', 'stop', 'restart'] as const
const DEPLOY = ['up', 'down'] as const

export async function GET() {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || !ability.can('read', 'Docker')) {
        return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    try {
        return NextResponse.json({ stacks: await listDockerStacks() })
    } catch (err) {
        console.error('[API] Lecture des stacks Compose impossible:', err)
        const message = (err as Error).message || 'Erreur interne'
        return NextResponse.json({ error: message, message }, { status: 500 })
    }
}

/** Demarre, arrete ou redemarre tous les conteneurs d'une stack. */
export async function POST(request: Request) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || !canManageDockerState(ability)) {
        return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    try {
        const { project, action } = await request.json()

        const isLifecycle = (LIFECYCLE as readonly string[]).includes(action)
        const isDeploy = (DEPLOY as readonly string[]).includes(action)

        if (!project || !(isLifecycle || isDeploy)) {
            return NextResponse.json({ error: 'Parametres invalides' }, { status: 400 })
        }

        // `up` / `down` recreent les conteneurs a partir des fichiers ;
        // start / stop se contentent d'agir sur ceux qui existent deja.
        if (isDeploy) {
            try {
                const deploy = await redeployStack(project, action)

                try {
                    const { logAction } = await import('@/lib/audit')
                    await logAction(parseInt(user.id), 'DOCKER_ACTION', 'Docker', project, {
                        action: `compose-${action}`,
                    })
                } catch (auditErr) {
                    console.error('[API] Echec de journalisation du deploiement:', auditErr)
                }

                if (!deploy.success) {
                    const message = deploy.error || 'Deploiement en echec'
                    return NextResponse.json({ error: message, message, output: deploy.output }, { status: 500 })
                }

                return NextResponse.json({ success: true, output: deploy.output })
            } catch (deployErr) {
                const status = deployErr instanceof ComposeFilesUnavailableError ? 503 : 500
                const message = (deployErr as Error).message || 'Deploiement impossible'
                return NextResponse.json({ error: message, message }, { status })
            }
        }

        const result = await applyStackAction(project, action)

        try {
            const { logAction } = await import('@/lib/audit')
            await logAction(parseInt(user.id), 'DOCKER_ACTION', 'Docker', project, {
                action: `stack-${action}`,
                done: result.done,
                total: result.total,
            })
        } catch (auditErr) {
            console.error('[API] Echec de journalisation de l action stack:', auditErr)
        }

        if (!result.success) {
            const message = `${result.done}/${result.total} conteneurs traites. Echecs : ${result.failures
                .map(f => `${f.name} (${f.error})`)
                .join(', ')}`
            return NextResponse.json({ error: message, message, ...result }, { status: 500 })
        }

        return NextResponse.json(result)
    } catch (err) {
        console.error('[API] Action sur une stack Compose impossible:', err)
        const message = (err as Error).message || 'Erreur interne'
        return NextResponse.json({ error: message, message }, { status: 500 })
    }
}
