/**
 * Les « groupes » de conteneurs de MediaHub, adossés à l'organizer Docker
 * d'Unraid (7.2+) plutôt qu'à une table maison.
 *
 * Correspondance :
 *   groupe MediaHub  ->  dossier de premier niveau sous la racine de la vue
 *   membre du groupe ->  entrée conteneur enfant de ce dossier
 *
 * Conséquence directe : les dossiers créés ici apparaissent dans l'interface
 * Docker d'Unraid, et inversement. Il n'y a plus qu'une seule source de vérité.
 */

import {
    createUnraidServiceFromSettings,
    type UnraidOrganizerEntry,
    type UnraidOrganizerView,
    type UnraidService,
} from './unraid'

export interface DockerGroup {
    id: string
    name: string
    members: { containerName: string }[]
}

/**
 * Levée quand l'organizer n'est pas joignable : Unraid non configuré, clé
 * d'API invalide, ou version antérieure à 7.2 (le champ `organizer` n'existe
 * alors pas dans le schéma).
 */
export class OrganizerUnavailableError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'OrganizerUnavailableError'
    }
}

const FOLDER = 'folder'

async function loadView(): Promise<{ service: UnraidService; view: UnraidOrganizerView }> {
    const service = await createUnraidServiceFromSettings()
    if (!service) {
        throw new OrganizerUnavailableError(
            "L'API Unraid n'est pas configurée. Renseignez l'URL et la clé d'API dans Réglages → Stockage."
        )
    }

    try {
        const view = await service.getOrganizerView()
        return { service, view }
    } catch (error) {
        throw new OrganizerUnavailableError(
            `L'organizer Docker est inaccessible (Unraid 7.2 minimum requis) : ${(error as Error).message}`
        )
    }
}

/**
 * Nom du conteneur porté par une entrée, tel que l'affiche la liste Docker.
 * Retourne null pour un dossier.
 */
function containerNameOf(entry: UnraidOrganizerEntry): string | null {
    if (entry.type === FOLDER) return null

    const fromMeta = entry.meta?.names?.[0]
    const raw = fromMeta || entry.name
    if (!raw) return null

    return raw.startsWith('/') ? raw.slice(1) : raw
}

/** Index nom de conteneur -> identifiant d'entrée dans l'organizer. */
function indexByContainerName(view: UnraidOrganizerView): Map<string, string> {
    const index = new Map<string, string>()
    for (const entry of view.flatEntries) {
        const name = containerNameOf(entry)
        if (name) index.set(name, entry.id)
    }
    return index
}

function findFolder(view: UnraidOrganizerView, folderId: string): UnraidOrganizerEntry {
    const folder = view.flatEntries.find(e => e.id === folderId && e.type === FOLDER)
    if (!folder) throw new Error(`Groupe « ${folderId} » introuvable dans l'organizer Unraid`)
    return folder
}

function toGroup(view: UnraidOrganizerView, folder: UnraidOrganizerEntry): DockerGroup {
    const byId = new Map(view.flatEntries.map(e => [e.id, e]))

    const members = folder.childrenIds
        .map(childId => byId.get(childId))
        .map(child => (child ? containerNameOf(child) : null))
        .filter((name): name is string => name !== null)
        .map(containerName => ({ containerName }))

    return { id: folder.id, name: folder.name, members }
}

/** Les dossiers de premier niveau de la vue, exposés comme groupes. */
export async function listDockerGroups(): Promise<DockerGroup[]> {
    const { view } = await loadView()

    return view.flatEntries
        .filter(e => e.type === FOLDER && e.parentId === view.rootId)
        .sort((a, b) => a.position - b.position)
        .map(folder => toGroup(view, folder))
}

export async function createDockerGroup(name: string): Promise<void> {
    const { service, view } = await loadView()
    await service.createOrganizerFolder(name, view.rootId)
}

export async function renameDockerGroup(groupId: string, name: string): Promise<void> {
    const { service, view } = await loadView()
    findFolder(view, groupId)
    await service.renameOrganizerFolder(groupId, name)
}

/**
 * Supprime le dossier. Unraid réattache ses conteneurs à la racine : on ne
 * perd jamais un conteneur en supprimant un groupe.
 */
export async function deleteDockerGroup(groupId: string): Promise<void> {
    const { service, view } = await loadView()
    findFolder(view, groupId)
    await service.deleteOrganizerEntries([groupId])
}

/**
 * Aligne les membres d'un groupe sur la liste fournie.
 *
 * On procède par différence plutôt qu'en réécrivant les enfants du dossier :
 * `moveDockerEntriesToFolder` détache proprement chaque entrée de son parent
 * actuel, là où un remplacement en bloc laisserait l'arbre incohérent. Les
 * sous-dossiers éventuels du groupe ne sont pas touchés.
 */
export async function setDockerGroupMembers(
    groupId: string,
    containerNames: string[]
): Promise<void> {
    const { service, view } = await loadView()
    const folder = findFolder(view, groupId)

    const byId = new Map(view.flatEntries.map(e => [e.id, e]))
    const byName = indexByContainerName(view)
    const desired = new Set(containerNames)

    const currentContainerIds = folder.childrenIds.filter(id => byId.get(id)?.type !== FOLDER)
    const currentIds = new Set(currentContainerIds)

    const toAdd = containerNames
        .map(name => byName.get(name))
        .filter((id): id is string => !!id && !currentIds.has(id))

    const toRemove = currentContainerIds.filter(id => {
        const name = containerNameOf(byId.get(id)!)
        return !name || !desired.has(name)
    })

    if (toRemove.length > 0) await service.moveOrganizerEntries(toRemove, view.rootId)
    if (toAdd.length > 0) await service.moveOrganizerEntries(toAdd, groupId)
}
