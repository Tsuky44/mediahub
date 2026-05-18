'use server'

import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/auth'
import { ConfigStore } from '@/lib/notifications-v2'
import type { NotificationsV2Config, NotificationEvent } from '@/lib/notifications-v2'
import { notificationBus, NOTIFICATION_EVENTS } from '@/lib/notifications-v2'

/** Only admins can manage config. */
async function assertAdmin() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  if ((user as any).role !== 'admin' && (user as any).role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return user
}

export async function getNotificationsV2Config() {
  await assertAdmin()
  return ConfigStore.load(true)
}

export async function saveNotificationsV2Config(cfg: NotificationsV2Config) {
  await assertAdmin()
  await ConfigStore.save(cfg)
  console.log(
    `[NotificationsV2][Save] enabled=${cfg.enabled}, evolution.apiUrl=${!!cfg.evolution.apiUrl}, evolution.instance="${cfg.evolution.instance}", defaultNumber="${cfg.evolution.defaultNumber}"`
  )
  return { success: true }
}

export async function getUsersForNotifications() {
  await assertAdmin()
  const usersList = await db.query.users.findMany({
    columns: { id: true, name: true, email: true, whatsappNumber: true },
    orderBy: (users, { asc }) => [asc(users.name)],
  })
  return usersList.map(u => ({
    id: u.id,
    name: u.name ?? '',
    email: u.email ?? '',
    hasWhatsapp: !!(u.whatsappNumber && u.whatsappNumber.trim()),
  }))
}

export async function pingEvolutionApi(
  apiUrl: string,
  apiKey: string,
  instance: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  await assertAdmin()

  if (!apiUrl || !apiKey || !instance) {
    return { success: false, message: '⚠️ Remplis tous les champs (URL, API Key, Instance) avant de tester.' }
  }

  const url = apiUrl.replace(/\/$/, '')
  const start = Date.now()

  try {
    const res = await fetch(`${url}/instance/connectionState/${encodeURIComponent(instance)}`, {
      method: 'GET',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })

    const latencyMs = Date.now() - start

    if (res.status === 401 || res.status === 403) {
      return { success: false, message: `❌ API Key invalide (HTTP ${res.status})`, latencyMs }
    }
    if (res.status === 404) {
      return { success: false, message: `❌ Instance "${instance}" introuvable (HTTP 404)`, latencyMs }
    }
    if (!res.ok) {
      return { success: false, message: `❌ Erreur HTTP ${res.status}`, latencyMs }
    }

    const data = await res.json().catch(() => ({}))
    const state: string = data?.instance?.state ?? data?.state ?? 'unknown'

    if (state === 'open') {
      return { success: true, message: `✅ Connecté — instance "${instance}" en ligne (${latencyMs}ms)`, latencyMs }
    }
    return {
      success: false,
      message: `⚠️ Connexion API OK mais instance "${instance}" déconnectée (état: ${state}) — ${latencyMs}ms`,
      latencyMs,
    }
  } catch (err: unknown) {
    const latencyMs = Date.now() - start
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort') || msg.includes('timeout')) {
      return { success: false, message: `❌ Timeout (${latencyMs}ms) — l'URL est-elle accessible depuis ce serveur ?`, latencyMs }
    }
    return { success: false, message: `❌ ${msg}`, latencyMs }
  }
}

export async function testNotificationsV2() {
  await assertAdmin()
  return testEventNotification('MEDIA_REQUESTED', 'movie')
}

export async function testEventNotification(
  event: NotificationEvent,
  mediaType: 'movie' | 'tv'
) {
  await assertAdmin()

  const persisted = await ConfigStore.load(true)
  if (!persisted.enabled) {
    return {
      success: false,
      message: '⚠️ Le module est désactivé en base. Coche "Activer le module" PUIS clique sur "Sauvegarder" avant de tester.',
    }
  }
  if (!persisted.evolution.apiUrl || !persisted.evolution.apiKey || !persisted.evolution.instance) {
    return {
      success: false,
      message: '⚠️ Configuration Evolution incomplète (apiUrl/apiKey/instance). Sauvegarde la config avant de tester.',
    }
  }

  const route = persisted.events[event]
  if (!route || !route.enabled) {
    return {
      success: false,
      message: `⚠️ L'événement ${event} est désactivé. Active-le dans la config avant de tester.`,
    }
  }

  const mediaBase = {
    tmdbId: 'test-' + event,
    mediaType,
    title: mediaType === 'movie' ? 'Avatar : La voie de l\'eau' : 'The Last of Us',
    year: 2024,
    overview: mediaType === 'movie'
      ? "Jake Sully vit avec sa nouvelle famille sur la planète Pandora. Lorsqu'une ancienne menace resurgit, il doit affronter un difficile combat pour protéger son peuple."
      : "Vingt ans après la destruction de la civilisation moderne, Joel est embauché pour faire sortir Ellie, une adolescente de 14 ans, d'une zone de quarantaine. Ce qui commence comme une petite besogne va vite tourner au cauchemar.",
    genres: mediaType === 'movie' ? 'Science-fiction, Aventure' : 'Drame, Horreur, Action',
    rating: mediaType === 'movie' ? '7.8' : '9.2',
    posterPath: mediaType === 'movie'
      ? '/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg'
      : '/uDgy6hyPd82kOHh6I95FLtwLNeA.jpg',
  }

  await notificationBus.emit(event, {
    media: mediaBase,
    requester: {
      id: 0,
      name: 'Admin Test',
      email: 'admin@mediahub.test',
      whatsappNumber: '',
    },
    download: mediaType === 'movie'
      ? {
          quality: '2160p',
          size: '18.4 GB',
          progress: event === 'MEDIA_DOWNLOADING' ? 0.65 : undefined,
          releaseName: 'Avatar.The.Way.of.Water.2024.MULTi.VF2.2160p.HDR.DV.WEB-DL.H265.mkv',
        }
      : {
          quality: '1080p',
          size: '4.2 GB',
          progress: event === 'MEDIA_DOWNLOADING' ? 0.32 : undefined,
          releaseName: 'The.Last.of.Us.S02E03.1080p.WEB-DL.DDP5.1.H.264.mkv',
        },
    failure: event === 'MEDIA_FAILED'
      ? { reason: 'Aucune release trouvée après 3 jours de recherche.', stage: 'download' }
      : undefined,
  })

  return { success: true, message: `Événement ${event} (${mediaType}) de test envoyé.` }
}
