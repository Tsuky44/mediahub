/**
 * Orchestrateur de la carte vivante : fusionne l'état, décide s'il faut
 * envoyer, filtre par verbosité d'appareil, rend et expédie.
 *
 * Chemin volontairement DIRECT : ni ligne d'événement, ni clé de déduplication,
 * ni outbox, ni retry. Une progression périmée n'a aucune valeur, et rejouer
 * « 47 % » cinq minutes plus tard afficherait une valeur fausse. Corollaire
 * assumé : un rafraîchissement perdu l'est définitivement — le palier suivant
 * rattrape 10 % plus loin.
 *
 * Bénéfice secondaire : les tables partagées avec WhatsApp restent propres.
 */

import { logger } from '@/lib/logger'
import { getSubscriptionsForUsers, type PushSubscriptionRecord } from './store'
import { sendPush } from './sender'
import {
  buildLiveTag,
  buildLiveTitle,
  buildLiveBody,
  buildPosterUrl,
  isTerminalStep,
  type LiveStep,
  type LiveCardSnapshot,
} from './live-card'
import {
  upsertLiveCard,
  shouldSend,
  markLiveCardSent,
  deleteLiveCard,
} from './live-card-store'

export interface RefreshLiveCardParams {
  tmdbId: string
  mediaType: string
  seasonNumber?: number
  step: LiveStep
  /** Fusionné avec le contexte déjà accumulé sur la carte. */
  snapshot: Partial<LiveCardSnapshot>
  /** Utilisateurs à notifier — tous leurs appareils sont ciblés. */
  userIds: number[]
  /** Force l'envoi même sans changement d'étape ni palier franchi. */
  force?: boolean
}

export interface RefreshLiveCardResult {
  sent: number
  skipped: boolean
  reason?: string
}

/**
 * Point d'entrée unique de la carte vivante.
 * Ne throw jamais : appelé depuis des pollers qui ne doivent pas mourir.
 */
export async function refreshLiveCard(
  params: RefreshLiveCardParams
): Promise<RefreshLiveCardResult> {
  const tag = buildLiveTag(params.mediaType, params.tmdbId, params.seasonNumber)

  try {
    if (params.userIds.length === 0) {
      return { sent: 0, skipped: true, reason: 'aucun destinataire' }
    }

    const { state, stepChanged } = await upsertLiveCard({
      tag,
      tmdbId: params.tmdbId,
      mediaType: params.mediaType,
      seasonNumber: params.seasonNumber,
      step: params.step,
      snapshot: params.snapshot,
    })

    const progress = state.snapshot.progress
    if (!params.force && !shouldSend(state, stepChanged, progress)) {
      return { sent: 0, skipped: true, reason: 'palier non franchi' }
    }

    const subs = await getSubscriptionsForUsers(params.userIds)
    const targets = subs.filter((s) => acceptsUpdate(s, state.step, stepChanged))

    if (targets.length === 0) {
      // On mémorise quand même : sans ça, la prochaine progression croirait
      // n'avoir jamais rien envoyé et déclencherait un envoi hors palier.
      await markLiveCardSent(state.id, progress)
      return { sent: 0, skipped: true, reason: 'aucun appareil au bon volume' }
    }

    const terminal = isTerminalStep(state.step)
    const body = buildLiveBody(state.step, state.snapshot)
    const image = buildPosterUrl(state.snapshot.posterPath)
    const url = `/dashboard/media/${state.tmdbId}?type=${state.mediaType}`

    let sent = 0
    await Promise.all(
      targets.map(async (sub) => {
        const result = await sendPush(sub, {
          // Le titre dépend du destinataire : le nom du demandeur est masqué
          // quand c'est lui-même qui regarde sa demande.
          title: buildLiveTitle(state.snapshot, sub.userId),
          body,
          tag,
          url,
          image,
          // Seul l'état terminal vibre : les étapes intermédiaires actualisent
          // la carte en silence. (Sans effet sur iOS, qui alerte toujours.)
          renotify: terminal,
          requireInteraction: terminal,
          // Un palier de progression n'a aucune raison de réveiller l'appareil ;
          // l'arrivée du média, si.
          urgency: terminal ? 'high' : stepChanged ? 'normal' : 'low',
        })
        if (result.success) sent++
      })
    )

    await markLiveCardSent(state.id, progress)

    // La carte a fini son cycle : plus rien ne la fera avancer.
    if (terminal) {
      await deleteLiveCard(tag)
    }

    logger.info(
      `[Push][LiveCard] ${tag} → ${state.step}${progress != null ? ` (${Math.round(progress)}%)` : ''} · ${sent}/${targets.length} appareil(s)`
    )
    return { sent, skipped: false }
  } catch (err) {
    logger.error(`[Push][LiveCard] Échec du rafraîchissement de ${tag}:`, err)
    return { sent: 0, skipped: true, reason: 'erreur interne' }
  }
}

/**
 * Filtre par volume choisi sur l'appareil.
 *
 * `steps` est le défaut iOS : iOS n'honore ni `silent` ni `renotify`, donc
 * chaque push y produit une alerte. Sans ce filtre, 10 paliers de progression
 * = 10 vibrations pour un seul téléchargement.
 */
function acceptsUpdate(
  sub: PushSubscriptionRecord,
  step: LiveStep,
  stepChanged: boolean
): boolean {
  switch (sub.verbosity) {
    case 'all':
      return true
    case 'steps':
      return stepChanged
    case 'final':
      return isTerminalStep(step)
    default:
      return true
  }
}

/** Réécrit une carte en « suivi interrompu ». */
export async function markLiveCardStalled(
  tmdbId: string,
  mediaType: string,
  seasonNumber: number | undefined,
  userIds: number[]
): Promise<void> {
  await refreshLiveCard({
    tmdbId,
    mediaType,
    seasonNumber,
    step: 'stalled',
    snapshot: {},
    userIds,
    force: true,
  })
}
