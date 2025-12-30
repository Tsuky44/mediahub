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

    // On n'enregistre que la fin de lecture ou le progrès significatif (optionnel)
    // Pour les stats de type Tautulli, on enregistre généralement à l'arrêt
    if (eventType === 'PlaybackStop' && embyUserId && item) {
      const itemId = String(item.Id)
      const playedAt = new Date()
      
      // Calcul de la durée en minutes (ticks -> minutes)
      // 10,000,000 ticks = 1 seconde
      const positionTicks = playbackInfo?.PositionTicks || 0
      const durationMinutes = Math.round(positionTicks / 600000000)

      // On n'enregistre que si la durée est significative (ex: > 1 min)
      if (durationMinutes >= 1) {
        // Trouver l'utilisateur local
        const user = await prisma.user.findFirst({
          where: { embyUserId: embyUserId }
        })

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

        console.log(`[Webhook] Recorded playback for ${item.Name} (${durationMinutes} min)`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook Error]', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
