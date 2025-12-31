'use server'

import { prisma } from '@/lib/prisma'
import { embyService } from '@/lib/services/emby'
import { syncActiveSessions } from '@/lib/services/watch-sync'
import { getSetting, setSetting } from '@/lib/settings'

export async function fetchAdvancedStats() {
  try {
    // Synchronisation automatique en arrière-plan (toutes les 2 minutes par exemple)
    const lastSyncStr = await getSetting('last_watch_sync')
    const lastSync = lastSyncStr ? parseInt(lastSyncStr) : 0
    const now = Date.now()
    
    if (now - lastSync > 120000) { // 2 minutes
        syncActiveSessions().then(() => {
            setSetting('last_watch_sync', Date.now().toString())
        }).catch(err => console.error('Auto watch sync failed', err))
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 1. Temps réel (Sessions actives via Emby)
    const activeSessions = await embyService.getSessions()
    const livePlaying = activeSessions.filter((s: any) => s.NowPlayingItem)

    // 2. Top mois (Films et Séries les plus vus basés sur WatchEvent + Sessions actives)
    const topWatched = await prisma.watchEvent.groupBy({
      by: ['itemId', 'itemType', 'itemName', 'seriesName'],
      _count: { id: true },
      _sum: { durationMinutes: true },
      where: { 
        playedAt: { gte: thirtyDaysAgo }
      },
      orderBy: { 
        _sum: { durationMinutes: 'desc' } 
      },
      take: 20
    })

    // On traite les données pour regrouper les épisodes sous la même série si nécessaire
    const mediaMap: Record<string, any> = {}
    
    // Ajouter les données de la DB
    topWatched.forEach(item => {
      const name = (item.itemType === 'Episode' && item.seriesName) ? item.seriesName : (item.itemName || 'Inconnu')
      const type = item.itemType === 'Episode' ? 'Série' : 'Film'
      
      if (!mediaMap[name]) {
        mediaMap[name] = { name, type, plays: 0, minutes: 0 }
      }
      mediaMap[name].plays += item._count.id
      mediaMap[name].minutes += item._sum.durationMinutes || 0
    })

    // AJOUT : Fusionner les sessions en cours pour un affichage instantané
    livePlaying.forEach((session: any) => {
      const item = session.NowPlayingItem
      if (!item) return

      const isPaused = session.PlayState?.IsPaused
      const name = (item.Type === 'Episode' && item.SeriesName) ? item.SeriesName : (item.Name || 'Inconnu')
      const type = item.Type === 'Episode' ? 'Série' : 'Film'
      
      // On n'ajoute les minutes que si la session n'est pas en pause
      const currentMinutes = (!isPaused && session.PlayState?.PositionTicks) 
        ? Math.round(session.PlayState.PositionTicks / 600000000) 
        : 0

      if (!mediaMap[name]) {
        mediaMap[name] = { name, type, plays: 0, minutes: 0 }
      }
      
      // On n'ajoute une "vue" que si cet item précis n'est pas déjà dans les topWatched de la DB
      // (On simplifie ici car topWatched est déjà groupé par itemName)
      const alreadyInDB = topWatched.some(dbItem => dbItem.itemName === item.Name || dbItem.seriesName === item.SeriesName)
      
      if (!alreadyInDB) {
        mediaMap[name].plays += 1
      }
      mediaMap[name].minutes += currentMinutes
    })

    const finalTopItems = Object.values(mediaMap)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10)

    // 3. Utilisateurs les plus actifs (par durée de visionnage + sessions actives)
    const topUsersRaw = await prisma.watchEvent.findMany({
      where: { 
        playedAt: { gte: thirtyDaysAgo } 
      },
      select: {
        userId: true,
        embyUserId: true,
        itemType: true,
        durationMinutes: true,
      }
    })

    // Enrichir les données utilisateurs avec leurs noms
    const embyUsers = await embyService.getUsers()
    
    // Map pour fusionner DB + Live
    const userStatsMap: Record<string, any> = {}

    // Traiter les données de la DB pour les utilisateurs
    for (const stat of topUsersRaw) {
      const key = stat.embyUserId
      if (!userStatsMap[key]) {
        userStatsMap[key] = {
          embyUserId: stat.embyUserId,
          name: 'Utilisateur inconnu',
          image: null,
          totalMinutes: 0,
          movieCount: 0,
          episodeCount: 0,
          totalPlays: 0
        }
      }

      userStatsMap[key].totalMinutes += stat.durationMinutes || 0
      userStatsMap[key].totalPlays += 1
      if (stat.itemType === 'Movie') userStatsMap[key].movieCount += 1
      if (stat.itemType === 'Episode') userStatsMap[key].episodeCount += 1
    }

    // AJOUT : Fusionner les sessions en cours pour les utilisateurs
    livePlaying.forEach((session: any) => {
      const embyUserId = session.UserId
      const name = session.UserName
      const itemType = session.NowPlayingItem?.Type
      const isPaused = session.PlayState?.IsPaused
      
      // On n'ajoute les minutes que si la session n'est pas en pause
      const currentMinutes = (!isPaused && session.PlayState?.PositionTicks) 
        ? Math.round(session.PlayState.PositionTicks / 600000000) 
        : 0

      if (!userStatsMap[embyUserId]) {
        userStatsMap[embyUserId] = {
          embyUserId,
          name,
          image: null,
          totalMinutes: 0,
          movieCount: 0,
          episodeCount: 0,
          totalPlays: 0
        }
      }
      
      userStatsMap[embyUserId].totalMinutes += currentMinutes
      userStatsMap[embyUserId].totalPlays += 1
      if (itemType === 'Movie') userStatsMap[embyUserId].movieCount += 1
      if (itemType === 'Episode') userStatsMap[embyUserId].episodeCount += 1
    })

    // Enrichir les noms et images
    const finalUsersWithNames = await Promise.all(
      Object.values(userStatsMap).map(async (u: any) => {
        // 1. Chercher dans Emby
        const embyUser = embyUsers.find((eu: any) => eu.Id === u.embyUserId)
        if (embyUser) {
          u.name = embyUser.Name
        }

        // 2. Chercher dans notre DB locale pour l'image
        const localUser = await prisma.user.findFirst({ where: { embyUserId: u.embyUserId } })
        if (localUser) {
          if (localUser.name) u.name = localUser.name
          u.image = localUser.image
        }

        return u
      })
    )

    const finalTopUsers = finalUsersWithNames
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 5)

    return {
      live: livePlaying.map((s: any) => ({
        userName: s.UserName,
        itemName: s.NowPlayingItem.Name,
        itemType: s.NowPlayingItem.Type,
        seriesName: s.NowPlayingItem.SeriesName,
        seasonNumber: s.NowPlayingItem.ParentIndexNumber,
        episodeNumber: s.NowPlayingItem.IndexNumber,
        percentDone: s.PlayState.PositionTicks ? Math.round((s.PlayState.PositionTicks / s.NowPlayingItem.RunTimeTicks) * 100) : 0,
        deviceId: s.DeviceName
      })),
      topItems: finalTopItems,
      topUsers: finalTopUsers
    }
  } catch (e) {
    console.error('[fetchAdvancedStats] Failed', e)
    return { live: [], topItems: [], topUsers: [] }
  }
}

export async function fetchUserProfileStats(embyUserId: string) {
  try {
    const events = await prisma.watchEvent.findMany({
      where: { embyUserId },
      orderBy: { playedAt: 'desc' }
    })

    // 1. Infos utilisateur
    const embyUsers = await embyService.getUsers()
    const embyUser = embyUsers.find((u: any) => u.Id === embyUserId)
    const localUser = await prisma.user.findFirst({ where: { embyUserId } })

    // 2. Calculs globaux
    let totalMinutes = 0
    let movieCount = 0
    let episodeCount = 0
    const seriesMap: Record<string, { count: number, minutes: number }> = {}
    const itemsMap: Record<string, { name: string, type: string, count: number, minutes: number }> = {}
    
    // Pour les stats temporelles (par heure)
    const hourlyActivity = new Array(24).fill(0)
    
    // AJOUT : Récupérer les sessions actives pour ce user
    const activeSessions = await embyService.getSessions()
    const userLiveSession = activeSessions.find((s: any) => s.UserId === embyUserId && s.NowPlayingItem)

    // Traiter l'historique (DB)
    events.forEach(event => {
      totalMinutes += event.durationMinutes || 0
      if (event.itemType === 'Movie') movieCount++
      if (event.itemType === 'Episode') episodeCount++

      const hour = new Date(event.playedAt).getHours()
      hourlyActivity[hour]++

      if (event.itemType === 'Episode' && event.seriesName) {
        if (!seriesMap[event.seriesName]) seriesMap[event.seriesName] = { count: 0, minutes: 0 }
        seriesMap[event.seriesName].count++
        seriesMap[event.seriesName].minutes += event.durationMinutes || 0
      }

      const itemKey = event.itemId
      if (!itemsMap[itemKey]) {
        itemsMap[itemKey] = { 
          name: event.itemName || 'Inconnu', 
          type: event.itemType || 'Inconnu', 
          count: 0, 
          minutes: 0 
        }
      }
      itemsMap[itemKey].count++
      itemsMap[itemKey].minutes += event.durationMinutes || 0
    })

    // AJOUT : Fusionner la session en direct si elle existe
    if (userLiveSession) {
      const item = userLiveSession.NowPlayingItem
      const currentMinutes = userLiveSession.PlayState?.PositionTicks ? Math.round(userLiveSession.PlayState.PositionTicks / 600000000) : 0
      
      totalMinutes += currentMinutes
      if (item.Type === 'Movie') movieCount++
      if (item.Type === 'Episode') episodeCount++

      const hour = new Date().getHours()
      hourlyActivity[hour]++

      if (item.Type === 'Episode' && item.SeriesName) {
        if (!seriesMap[item.SeriesName]) seriesMap[item.SeriesName] = { count: 0, minutes: 0 }
        seriesMap[item.SeriesName].count++
        seriesMap[item.SeriesName].minutes += currentMinutes
      }

      const itemKey = item.Id
      if (!itemsMap[itemKey]) {
        itemsMap[itemKey] = { 
          name: item.Name || 'Inconnu', 
          type: item.Type || 'Inconnu', 
          count: 0, 
          minutes: 0 
        }
      }
      itemsMap[itemKey].count++
      itemsMap[itemKey].minutes += currentMinutes
    }

    // Top Séries
    const topSeries = Object.entries(seriesMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5)

    // Top Médias individuels
    const topItems = Object.values(itemsMap)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10)

    // Dernières lectures
    const recentHistory = events.slice(0, 10).map(e => ({
      name: e.itemName,
      type: e.itemType,
      seriesName: e.seriesName,
      playedAt: e.playedAt,
      duration: e.durationMinutes
    }))

    return {
      user: {
        name: localUser?.name || embyUser?.Name || userLiveSession?.UserName || 'Utilisateur',
        image: localUser?.image || (embyUser?.PrimaryImageTag ? `/api/media/image/${embyUserId}?type=Primary` : null),
        lastSeen: userLiveSession ? new Date() : events[0]?.playedAt,
        isOnline: !!userLiveSession
      },
      stats: {
        totalMinutes,
        movieCount,
        episodeCount,
        totalSessions: events.length,
        daysActive: new Set(events.map(e => e.playedAt.toDateString())).size
      },
      topSeries,
      topItems,
      recentHistory,
      hourlyActivity
    }
  } catch (e) {
    console.error('[fetchUserProfileStats] Failed', e)
    return null
  }
}
