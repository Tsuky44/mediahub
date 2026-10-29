import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageDockerState, defineAbilityFor } from '@/lib/ability'
import { listDockerStacks } from '@/lib/services/docker-stacks'
import {
    ComposeFilesUnavailableError,
    readComposeFiles,
    writeComposeFile,
} from '@/lib/services/docker-compose-files'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ project: string }> }

async function resolveStack(project: string) {
    const stacks = await listDockerStacks()
    return stacks.find(s => s.project === project) ?? null
}

function failure(error: unknown, fallback: string) {
    const status = error instanceof ComposeFilesUnavailableError ? 503 : 500
    const message = (error as Error).message || fallback

    if (status === 500) console.error(`[API] ${fallback}:`, error)
    return NextResponse.json({ error: message, message }, { status })
}

/** Fichiers editables d'une stack (compose + .env). */
export async function GET(_request: Request, { params }: RouteContext) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    // Les fichiers compose contiennent des secrets : meme droit que la lecture
    // des variables d'environnement, pas le simple droit de lister.
    if (!session || !ability.can('read_details', 'Docker')) {
        return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { project } = await params

    try {
        const stack = await resolveStack(project)
        if (!stack?.workingDir) {
            return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
        }

        const files = await readComposeFiles(stack.workingDir, stack.configFiles)
        return NextResponse.json({ files, workingDir: stack.workingDir })
    } catch (err) {
        return failure(err, 'Lecture des fichiers du projet impossible')
    }
}

/** Enregistre un fichier du projet, apres sauvegarde de la version precedente. */
export async function PUT(request: Request, { params }: RouteContext) {
    const session = await getServerSession(authOptions)
    const user = session?.user as any
    const ability = defineAbilityFor(user)

    if (!session || !canManageDockerState(ability)) {
        return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }

    const { project } = await params

    try {
        const { path: targetPath, content } = await request.json()

        if (typeof targetPath !== 'string' || typeof content !== 'string') {
            return NextResponse.json({ error: 'Parametres invalides' }, { status: 400 })
        }

        const stack = await resolveStack(project)
        if (!stack?.workingDir) {
            return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
        }

        const { backupPath } = await writeComposeFile(
            stack.workingDir,
            stack.configFiles,
            targetPath,
            content
        )

        try {
            const { logAction } = await import('@/lib/audit')
            await logAction(parseInt(user.id), 'DOCKER_ACTION', 'Docker', project, {
                action: 'compose-edit',
                file: targetPath,
                backup: backupPath,
            })
        } catch (auditErr) {
            console.error('[API] Echec de journalisation de l edition compose:', auditErr)
        }

        return NextResponse.json({ success: true, backupPath })
    } catch (err) {
        return failure(err, 'Enregistrement du fichier impossible')
    }
}
