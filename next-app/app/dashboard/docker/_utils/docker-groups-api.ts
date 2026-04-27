/**
 * Thin wrappers around the `/api/docker/groups` endpoints.
 *
 * Each helper resolves to `{ ok: true }` on success or
 * `{ ok: false, error: string }` on failure (HTTP error or network error),
 * letting the caller surface a single user-facing message without having
 * to duplicate fetch / try-catch boilerplate.
 */

interface ApiSuccess {
    ok: true
}

interface ApiFailure {
    ok: false
    error: string
}

export type DockerGroupApiResult = ApiSuccess | ApiFailure

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const

async function readError(res: Response, fallback: string): Promise<string> {
    try {
        const data = (await res.json()) as { error?: string }
        return data?.error || fallback
    } catch {
        return fallback
    }
}

export async function createDockerGroup(name: string): Promise<DockerGroupApiResult> {
    try {
        const res = await fetch('/api/docker/groups', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify({ name, members: [] }),
        })
        if (res.ok) return { ok: true }
        return { ok: false, error: await readError(res, 'Erreur lors de la création du groupe') }
    } catch (error) {
        console.error(error)
        return { ok: false, error: 'Erreur réseau lors de la création du groupe' }
    }
}

export async function updateDockerGroupName(
    groupId: string,
    name: string
): Promise<DockerGroupApiResult> {
    try {
        const res = await fetch(`/api/docker/groups/${groupId}`, {
            method: 'PUT',
            headers: JSON_HEADERS,
            body: JSON.stringify({ name }),
        })
        if (res.ok) return { ok: true }
        return {
            ok: false,
            error: await readError(res, 'Erreur lors de la mise à jour du groupe'),
        }
    } catch (error) {
        console.error(error)
        return { ok: false, error: 'Erreur réseau lors de la mise à jour du groupe' }
    }
}

export async function deleteDockerGroup(groupId: string): Promise<DockerGroupApiResult> {
    try {
        const res = await fetch(`/api/docker/groups/${groupId}`, { method: 'DELETE' })
        if (res.ok) return { ok: true }
        return {
            ok: false,
            error: await readError(res, 'Erreur lors de la suppression du groupe'),
        }
    } catch (error) {
        console.error(error)
        return { ok: false, error: 'Erreur réseau lors de la suppression du groupe' }
    }
}
