import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    let payload: any

    // Emby peut envoyer du JSON direct ou du multipart/form-data avec un champ "data"
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      payload = await req.json()
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const dataStr = formData.get('data') as string
      if (dataStr) {
        payload = JSON.parse(dataStr)
      }
    }

    if (!payload) {
      return NextResponse.json({ error: 'No payload' }, { status: 400 })
    }

    const eventType = payload.Event
    const embyUserId = payload.User?.Id
    const item = payload.Item
    const playbackInfo = payload.PlaybackInfo

    console.log(`[Webhook] Received event: ${eventType} for ${item?.Name} (User: ${payload.User?.Name})`)

    // On enregistre à l'arrêt OU lors d'une progression significative
    // PlaybackProgress permet d'avoir les stats même si la personne ne "finit" pas l'épisode proprement
    if ((eventType === 'PlaybackStop' || eventType === 'PlaybackProgress') && embyUserId && item) {
      const itemId = String(item.Id)
      const playedAt = new Date()
      
      // Calcul de la durée en minutes (ticks -> minutes)
      const positionTicks = playbackInfo?.PositionTicks || 0
      const durationMinutes = Math.round(positionTicks / 600000000)

      // On n'enregistre que si la durée est significative (ex: > 1 min)
      if (durationMinutes >= 1) {
        // Trouver l'utilisateur local
        const user = await prisma.user.findFirst({
          where: { embyUserId: embyUserId }
        })

        // On cherche s'il existe déjà un événement récent pour cet item/user pour le mettre à jour
        // au lieu d'en créer un nouveau à chaque "Progress"
        const existingEvent = await prisma.watchEvent.findFirst({
          where: {
            embyUserId,
            itemId,
            playedAt: {
              gte: new Date(Date.now() - 1000 * 60 * 60 * 4) // Dans les 4 dernières heures
            }
          },
          orderBy: { playedAt: 'desc' }
        })

        if (existingEvent) {
          // Mise à jour de l'événement existant avec la nouvelle durée
          await prisma.watchEvent.update({
            where: { id: existingEvent.id },
            data: {
              durationMinutes: Math.max(existingEvent.durationMinutes, durationMinutes),
              playedAt: new Date() // On actualise la date pour le "vu récemment"
            }
          })
          console.log(`[Webhook] Updated playback for ${item.Name} (${durationMinutes} min)`)
        } else {
          // Création d'un nouvel événement
          await prisma.watchEvent.create({
            data: {
              embyUserId,
              userId: user?.id,
              itemId,
              itemType: item.Type,
              itemName: item.Name,
              seriesName: item.SeriesName,
              durationMinutes,
              playedAt,
              plays: 1
            }
          })
          console.log(`[Webhook] Recorded new playback for ${item.Name} (${durationMinutes} min)`)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook Error]', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
