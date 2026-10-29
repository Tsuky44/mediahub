/**
 * Lecture et écriture des fichiers d'une stack Docker Compose.
 *
 * Ces fichiers vivent sur l'hôte, à l'emplacement que Docker inscrit dans les
 * labels du conteneur. Pour y accéder, le répertoire des projets doit être
 * monté dans le conteneur MediaHub **au même chemin** — sans quoi les chemins
 * lus dans les labels ne désignent rien ici.
 *
 * Voir `docker-compose.yml` : le volume `compose.manager/projects`.
 *
 * Deux précautions valent d'être expliquées :
 *
 * 1. Chez Unraid, ces projets sont sur `/boot`, c'est-à-dire **la clé USB**.
 *    Chaque écriture use le support. On n'écrit donc que sur demande
 *    explicite, jamais automatiquement.
 * 2. Un fichier compose invalide casse la stack au prochain déploiement. On
 *    conserve donc une copie horodatée avant toute écriture.
 */

import { promises as fs } from 'fs'
import path from 'path'

export interface ComposeFile {
    /** Chemin absolu sur l'hôte, tel qu'il figure dans les labels. */
    path: string
    /** Nom affiché (docker-compose.yml, .env…). */
    name: string
    content: string
    /** false quand le fichier est référencé mais absent du disque. */
    exists: boolean
}

/** Levée quand le répertoire des projets n'est pas monté dans le conteneur. */
export class ComposeFilesUnavailableError extends Error {
    constructor(target: string) {
        super(
            `Le répertoire du projet n'est pas accessible depuis MediaHub (${target}). ` +
                `Montez le répertoire des projets Compose dans le conteneur, au même chemin que sur l'hôte.`
        )
        this.name = 'ComposeFilesUnavailableError'
    }
}

/** Fichiers annexes proposés à l'édition en plus des fichiers compose. */
const COMPANION_FILES = ['.env']

async function readIfPresent(filePath: string): Promise<ComposeFile> {
    const entry: ComposeFile = {
        path: filePath,
        name: path.basename(filePath),
        content: '',
        exists: false,
    }

    try {
        entry.content = await fs.readFile(filePath, 'utf-8')
        entry.exists = true
    } catch (err) {
        // ENOENT sur un fichier annexe est normal (pas de .env dans la stack).
        // Tout autre code signale un problème d'accès, qu'on remonte.
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }

    return entry
}

/**
 * Vérifie que le répertoire d'un projet est bien atteignable depuis le
 * conteneur. C'est le test qui distingue « stack sans fichiers » de
 * « volume non monté », deux situations qui se présentent autrement pareil.
 */
export async function assertProjectReadable(workingDir: string): Promise<void> {
    try {
        await fs.access(workingDir)
    } catch {
        throw new ComposeFilesUnavailableError(workingDir)
    }
}

/**
 * Fichiers éditables d'une stack : ses fichiers compose, plus le `.env` du
 * répertoire s'il existe.
 */
export async function readComposeFiles(
    workingDir: string,
    configFiles: string[]
): Promise<ComposeFile[]> {
    await assertProjectReadable(workingDir)

    const companions = COMPANION_FILES.map(name => path.join(workingDir, name))
    const all = [...configFiles, ...companions]

    // Un même chemin peut apparaître deux fois si `.env` est aussi listé
    // comme fichier de configuration.
    const unique = [...new Set(all)]

    const files = await Promise.all(unique.map(readIfPresent))

    // On masque les fichiers annexes absents : proposer un onglet `.env` vide
    // sur une stack qui n'en a pas induirait en erreur.
    return files.filter(f => f.exists || configFiles.includes(f.path))
}

/**
 * Écrit un fichier après avoir vérifié qu'il fait bien partie du projet.
 *
 * Le contrôle de chemin n'est pas une formalité : sans lui, une requête
 * forgée écrirait n'importe où sur le système de fichiers monté.
 */
export async function writeComposeFile(
    workingDir: string,
    configFiles: string[],
    targetPath: string,
    content: string
): Promise<{ backupPath: string | null }> {
    await assertProjectReadable(workingDir)

    const resolvedTarget = path.resolve(targetPath)
    const resolvedDir = path.resolve(workingDir)

    const allowed =
        configFiles.map(f => path.resolve(f)).includes(resolvedTarget) ||
        COMPANION_FILES.map(name => path.resolve(path.join(workingDir, name))).includes(resolvedTarget)

    // Double barrière : appartenance à la liste blanche, et confinement au
    // répertoire du projet (pour bloquer un `..` glissé dans un chemin).
    if (!allowed || !resolvedTarget.startsWith(resolvedDir + path.sep)) {
        throw new Error(`Le fichier « ${targetPath} » ne fait pas partie de ce projet`)
    }

    let backupPath: string | null = null
    try {
        const existing = await fs.readFile(resolvedTarget, 'utf-8')
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        backupPath = `${resolvedTarget}.${stamp}.bak`
        await fs.writeFile(backupPath, existing, 'utf-8')
    } catch (err) {
        // Pas de sauvegarde à faire si le fichier n'existait pas encore.
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }

    await fs.writeFile(resolvedTarget, content, 'utf-8')
    return { backupPath }
}
