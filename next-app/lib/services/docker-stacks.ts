/**
 * Stacks Docker Compose.
 *
 * Un conteneur créé par `docker compose` porte des labels qui disent à quel
 * projet il appartient et où vivent ses fichiers. On s'appuie sur eux plutôt
 * que sur une configuration séparée : la source de vérité reste Docker.
 *
 * Ce que ce module fait : regrouper les conteneurs par projet et agir sur
 * l'ensemble (démarrer / arrêter / redémarrer).
 *
 * Il sait aussi redéployer une stack (`up -d` / `down`), ce qui recrée les
 * conteneurs et fait donc prendre effet aux modifications des fichiers. Cela
 * requiert deux choses côté déploiement : le répertoire des projets monté au
 * même chemin que sur l'hôte, et la CLI `docker compose` dans l'image.
 */

import { spawn } from 'child_process'
import { DockerService, type DockerLifecycleAction } from './docker'
import { assertProjectReadable } from './docker-compose-files'

export interface DockerStack {
    /** Nom du projet Compose (label `com.docker.compose.project`). */
    project: string
    /** Répertoire du projet sur l'hôte. */
    workingDir?: string
    /** Fichiers de configuration du projet, dans l'ordre de chargement. */
    configFiles: string[]
    containers: { id: string; name: string; state: string }[]
    running: number
    total: number
}

/** Actions applicables à une stack entière. */
export type StackAction = 'start' | 'stop' | 'restart'

/**
 * Regroupe les conteneurs par projet Compose.
 * Les conteneurs sans label de projet sont ignorés : ce sont les conteneurs
 * classiques, déjà gérés par la liste principale.
 */
export async function listDockerStacks(): Promise<DockerStack[]> {
    const containers = await DockerService.listContainers()
    if (!containers) return []

    const byProject = new Map<string, DockerStack>()

    for (const container of containers) {
        const labels = container as {
            composeProject?: string
            composeWorkingDir?: string
            composeConfigFiles?: string
        }

        const project = labels.composeProject
        if (!project) continue

        // Un conteneur réellement créé par `docker compose` porte toujours
        // `working_dir` et `config_files`. Le seul label `project` se retrouve
        // aussi sur des images *construites* par compose, qui le transmettent
        // à leurs conteneurs sans qu'aucune stack n'existe sur l'hôte — d'où
        // des projets fantômes si on ne recoupe pas.
        if (!labels.composeWorkingDir && !labels.composeConfigFiles) continue

        const existing = byProject.get(project)
        const entry = existing ?? {
            project,
            workingDir: labels.composeWorkingDir,
            configFiles: (labels.composeConfigFiles ?? '')
                .split(',')
                .map(f => f.trim())
                .filter(Boolean),
            containers: [],
            running: 0,
            total: 0,
        }

        entry.containers.push({
            id: container.id,
            name: container.name,
            state: container.state,
        })
        entry.total += 1
        if (container.state === 'RUNNING') entry.running += 1

        byProject.set(project, entry)
    }

    return [...byProject.values()].sort((a, b) => a.project.localeCompare(b.project, 'fr'))
}

export interface StackActionResult {
    success: boolean
    /** Conteneurs traités avec succès. */
    done: number
    total: number
    /** Détail des échecs, pour que l'utilisateur sache lesquels reprendre. */
    failures: { name: string; error: string }[]
}

/**
 * Applique une action à tous les conteneurs d'une stack.
 *
 * En série, et non en parallèle : une stack a souvent un ordre de démarrage
 * implicite (base de données avant application), et lancer huit conteneurs
 * simultanément sature l'hôte. Un échec n'interrompt pas le reste — on
 * remonte la liste des conteneurs en échec plutôt que de s'arrêter au premier.
 */
export async function applyStackAction(
    project: string,
    action: StackAction
): Promise<StackActionResult> {
    const stacks = await listDockerStacks()
    const stack = stacks.find(s => s.project === project)

    if (!stack) {
        return { success: false, done: 0, total: 0, failures: [{ name: project, error: 'Stack introuvable' }] }
    }

    // À l'arrêt, on prend l'ordre inverse du démarrage : les dépendances
    // s'éteignent après ce qui les consomme.
    const targets = action === 'stop' ? [...stack.containers].reverse() : stack.containers

    const failures: StackActionResult['failures'] = []
    let done = 0

    for (const container of targets) {
        const result = await DockerService.containerAction(container.id, action as DockerLifecycleAction)
        if (result.success) done += 1
        else failures.push({ name: container.name, error: result.error || 'échec inconnu' })
    }

    return { success: failures.length === 0, done, total: targets.length, failures }
}

/**
 * Redéploie une stack : `docker compose up -d`, ou `down`.
 *
 * À la différence de start/stop, qui se contentent d'allumer et d'éteindre
 * des conteneurs existants, ceci **recrée** les conteneurs à partir des
 * fichiers du projet. C'est la seule façon de faire prendre effet à une
 * modification du YAML ou du `.env`.
 *
 * Cela suppose la CLI `docker compose` dans l'image et le répertoire du
 * projet monté au même chemin que sur l'hôte ; en son absence on remonte un
 * message qui dit quoi faire, plutôt qu'un « command not found ».
 */
export async function redeployStack(
    project: string,
    mode: 'up' | 'down'
): Promise<{ success: boolean; output: string; error?: string }> {
    const stacks = await listDockerStacks()
    const stack = stacks.find(s => s.project === project)

    if (!stack || !stack.workingDir) {
        return { success: false, output: '', error: `Projet « ${project} » introuvable` }
    }

    await assertProjectReadable(stack.workingDir)

    const args = ['compose', '--project-name', project, '--project-directory', stack.workingDir]
    for (const file of stack.configFiles) args.push('--file', file)
    args.push(...(mode === 'up' ? ['up', '-d', '--remove-orphans'] : ['down']))

    return runDockerCli(args)
}

/** Exécute la CLI Docker et renvoie sa sortie combinée. */
function runDockerCli(args: string[]): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise(resolve => {
        const child = spawn('docker', args, { env: process.env })

        let output = ''
        const collect = (chunk: Buffer) => {
            output += chunk.toString('utf-8')
            // Un `up` verbeux peut produire beaucoup : on garde la fin, c'est
            // là que se trouvent l'erreur ou le récapitulatif.
            if (output.length > 20_000) output = output.slice(-20_000)
        }

        child.stdout.on('data', collect)
        child.stderr.on('data', collect)

        child.on('error', (err: NodeJS.ErrnoException) => {
            resolve({
                success: false,
                output,
                error:
                    err.code === 'ENOENT'
                        ? "La CLI `docker compose` n'est pas disponible dans le conteneur MediaHub."
                        : err.message,
            })
        })

        child.on('close', code => {
            resolve({
                success: code === 0,
                output,
                error: code === 0 ? undefined : `docker compose a retourné le code ${code}`,
            })
        })
    })
}
