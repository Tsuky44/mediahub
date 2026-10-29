/**
 * État partagé des cartes vivantes.
 *
 * Trois sources alimentent la même carte sans partager de mémoire : la route
 * API de demande, le poller qBittorrent (progression) et le poller de
 * disponibilité. D'où une table plutôt qu'un Map en mémoire — qui serait aussi
 * perdu à chaque redémarrage, laissant les cartes régresser.
 *
 * Ce n'est PAS l'outbox : aucune garantie de livraison, aucun rejeu. Une
 * progression périmée n'a pas de valeur.
 */

import { db } from '@/lib/db/drizzle'
import { pushLiveCards } from '@/lib/db/schema'
import { eq, lt } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { isForwardStep, buildPosterUrl, type LiveStep, type LiveCardSnapshot } from './live-card'

/** Palier de progression : en dessous, on n'envoie rien. */
const PROGRESS_STEP_PERCENT = 10
/** Plancher temporel entre deux envois pour une même carte. */
const MIN_INTERVAL_MS = 60_000

export interface LiveCardState {
  id: number
  tag: string
  tmdbId: string
  mediaType: string
  seasonNumber: number | null
  step: LiveStep
  lastProgressSent: number | null
  lastSentAt: Date | null
  snapshot: LiveCardSnapshot
}

export async function getLiveCard(tag: string): Promise<LiveCardState | null> {
  const row = await db.query.pushLiveCards.findFirst({
    where: eq(pushLiveCards.tag, tag),
  })
  if (!row) return null
  return {
    id: row.id,
    tag: row.tag,
    tmdbId: row.tmdbId,
    mediaType: row.mediaType,
    seasonNumber: row.seasonNumber,
    step: row.step as LiveStep,
    lastProgressSent: row.lastProgressSent,
    lastSentAt: row.lastSentAt,
    snapshot: safeParse(row.snapshot),
  }
}

export interface UpsertLiveCardParams {
  tag: string
  tmdbId: string
  mediaType: string
  seasonNumber?: number
  step: LiveStep
  snapshot: Partial<LiveCardSnapshot>
}

/**
 * Crée ou fait avancer une carte. Le snapshot est FUSIONNÉ : chaque source
 * n'apporte qu'une partie du contexte (la demande apporte le demandeur, le
 * grab apporte la qualité, qBittorrent apporte la progression).
 *
 * @returns l'état après fusion, et si l'étape a réellement avancé.
 */
export async function upsertLiveCard(
  params: UpsertLiveCardParams
): Promise<{ state: LiveCardState; stepChanged: boolean }> {
  const existing = await getLiveCard(params.tag)
  const now = new Date()

  if (!existing) {
    const snapshot = stripUnusablePoster(params.snapshot) as LiveCardSnapshot
    const inserted = await db
      .insert(pushLiveCards)
      .values({
        tag: params.tag,
        tmdbId: params.tmdbId,
        mediaType: params.mediaType,
        seasonNumber: params.seasonNumber ?? null,
        step: params.step,
        lastProgressSent: null,
        lastSentAt: null,
        snapshot: JSON.stringify(snapshot),
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: pushLiveCards.id })

    return {
      state: {
        id: inserted[0].id,
        tag: params.tag,
        tmdbId: params.tmdbId,
        mediaType: params.mediaType,
        seasonNumber: params.seasonNumber ?? null,
        step: params.step,
        lastProgressSent: null,
        lastSentAt: null,
        snapshot,
      },
      stepChanged: true,
    }
  }

  // Une carte ne régresse jamais : un événement en retard (webhook lent, poller
  // qui rattrape) ne doit pas ramener l'affichage à une étape déjà dépassée.
  const stepChanged = isForwardStep(existing.step, params.step)
  const nextStep = stepChanged ? params.step : existing.step
  const merged = {
    ...existing.snapshot,
    ...stripUndefined(stripUnusablePoster(params.snapshot)),
  }

  await db
    .update(pushLiveCards)
    .set({ step: nextStep, snapshot: JSON.stringify(merged), updatedAt: now })
    .where(eq(pushLiveCards.id, existing.id))

  return {
    state: { ...existing, step: nextStep, snapshot: merged },
    stepChanged,
  }
}

/**
 * Décide si un rafraîchissement mérite un envoi.
 *
 * Un changement d'étape passe toujours. Une progression ne passe que si elle a
 * franchi un palier de 10 % ET que le plancher de 60 s est écoulé — sans quoi
 * un téléchargement de deux heures produirait des centaines de réveils radio.
 */
export function shouldSend(
  state: LiveCardState,
  stepChanged: boolean,
  progress?: number
): boolean {
  if (stepChanged) return true
  if (progress == null) return false

  const bucket = Math.floor(progress / PROGRESS_STEP_PERCENT)
  const lastBucket =
    state.lastProgressSent != null
      ? Math.floor(state.lastProgressSent / PROGRESS_STEP_PERCENT)
      : -1
  if (bucket <= lastBucket) return false

  if (state.lastSentAt && Date.now() - state.lastSentAt.getTime() < MIN_INTERVAL_MS) {
    return false
  }
  return true
}

/** Mémorise ce qui vient d'être envoyé, pour le calcul du palier suivant. */
export async function markLiveCardSent(id: number, progress?: number): Promise<void> {
  await db
    .update(pushLiveCards)
    .set({
      lastSentAt: new Date(),
      ...(progress != null ? { lastProgressSent: Math.round(progress) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(pushLiveCards.id, id))
}

export async function deleteLiveCard(tag: string): Promise<void> {
  await db.delete(pushLiveCards).where(eq(pushLiveCards.tag, tag))
}

/**
 * Purge les cartes qu'aucune source n'a touchées depuis longtemps.
 * Filet de sécurité : la suppression normale a lieu à l'état terminal.
 */
export async function purgeStaleLiveCards(olderThanMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - olderThanMs)
    await db.delete(pushLiveCards).where(lt(pushLiveCards.updatedAt, cutoff))
  } catch (err) {
    logger.warn('[Push][LiveCard] Purge des cartes obsolètes échouée:', err)
  }
}

function safeParse(v: string): LiveCardSnapshot {
  try {
    return JSON.parse(v) as LiveCardSnapshot
  } catch {
    return { title: 'Média' }
  }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined)
  ) as Partial<T>
}

/**
 * Retire du fragment un `posterPath` qui ne donnerait pas d'image affichable.
 *
 * Les sources d'un même cycle ne se valent pas : un webhook Sonarr/Radarr peut
 * fournir `/MediaCover/42/poster.jpg`, chemin interne à l'instance, alors qu'un
 * événement passé par le dispatcher a déjà déposé le vrai poster TMDB. Comme
 * la fusion est un simple écrasement clé à clé, laisser passer ce chemin ferait
 * PERDRE l'image à la carte en cours de route — précisément au moment où elle
 * commence à afficher la progression.
 *
 * Une valeur absente est déjà protégée par `stripUndefined` ; c'est la valeur
 * présente mais inutilisable qu'il faut écarter ici.
 */
function stripUnusablePoster(
  fragment: Partial<LiveCardSnapshot>
): Partial<LiveCardSnapshot> {
  if (fragment.posterPath === undefined) return fragment
  if (buildPosterUrl(fragment.posterPath)) return fragment

  const { posterPath: _dropped, ...rest } = fragment
  return rest
}
