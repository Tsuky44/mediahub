import { db } from '@/lib/db/drizzle'
import { users, settings } from '@/lib/db/schema'
import { eq, inArray } from 'drizzle-orm'

interface ExternalNotificationPayload {
  title: string
  message: string
  event: string
  data?: any
}

export class ExternalNotificationService {
  /**
   * Envoie une notification externe basée sur les webhooks configurés (Global)
   */
  static async send(event: string, payload: Omit<ExternalNotificationPayload, 'event'>, requesterId?: number) {
    try {
      const [setting] = await db.select().from(settings).where(eq(settings.key, 'external_webhooks')).limit(1)

      if (!setting || !setting.value) return

      const webhooks = JSON.parse(setting.value)
      
      const activeWebhooks = webhooks.filter((w: any) => 
        w.enabled && 
        w.events && 
        w.events.includes(event)
      )

      if (activeWebhooks.length === 0) return

      const fullPayload = { ...payload, event }

      // Gérer l'envoi pour chaque webhook en fonction de ses destinataires
      const promises = activeWebhooks.map(async (webhook: any) => {
          // Si le webhook n'a pas de cible spécifique, c'est un webhook global (comme un channel Discord général)
          if ((!webhook.targetUsers || webhook.targetUsers.length === 0) && webhook.notifyRequester !== true) {
              return this.dispatchWebhook(webhook, fullPayload);
          }

          const localPromises = [];

          // 1. Notifier les cibles fixes (targetUsers)
          if (webhook.targetUsers && webhook.targetUsers.length > 0) {
              const targetIds = webhook.targetUsers.map((id: string) => parseInt(id));
              const targetUsers = await db.select().from(users).where(inArray(users.id, targetIds));

              for (const user of targetUsers) {
                  // Cloner le webhook et remplacer les identifiants globaux par ceux de l'utilisateur
                  const userWebhook = { ...webhook };
                  if (webhook.type === 'evolution' && user.whatsappNumber) {
                      userWebhook.whatsappNumber = user.whatsappNumber; // On force le numéro
                      localPromises.push(this.dispatchWebhook(userWebhook, fullPayload));
                  } else if (webhook.type === 'discord' && user.discordWebhook) {
                      userWebhook.url = user.discordWebhook;
                      localPromises.push(this.dispatchWebhook(userWebhook, fullPayload));
                  } else if (webhook.type === 'telegram' && user.telegramChatId) {
                      userWebhook.chatId = user.telegramChatId;
                      localPromises.push(this.dispatchWebhook(userWebhook, fullPayload));
                  } else if (webhook.type === 'custom' && user.customWebhook) {
                      userWebhook.url = user.customWebhook;
                      localPromises.push(this.dispatchWebhook(userWebhook, fullPayload));
                  }
              }
          }

          // 2. Notifier le requester (celui qui a demandé)
          if (webhook.notifyRequester === true && requesterId) {
              // Vérifier s'il n'a pas déjà été notifié via les targetUsers
              if (!webhook.targetUsers || !webhook.targetUsers.includes(requesterId.toString())) {
                  const [requester] = await db.select().from(users).where(eq(users.id, requesterId)).limit(1);
                  if (requester) {
                      const userWebhook = { ...webhook };
                      if (webhook.type === 'evolution' && requester.whatsappNumber) {
                          userWebhook.whatsappNumber = requester.whatsappNumber;
                          localPromises.push(this.dispatchWebhook(userWebhook, fullPayload));
                      } else if (webhook.type === 'discord' && requester.discordWebhook) {
                          userWebhook.url = requester.discordWebhook;
                          localPromises.push(this.dispatchWebhook(userWebhook, fullPayload));
                      } else if (webhook.type === 'telegram' && requester.telegramChatId) {
                          userWebhook.chatId = requester.telegramChatId;
                          localPromises.push(this.dispatchWebhook(userWebhook, fullPayload));
                      }
                  }
              }
          }

          return Promise.allSettled(localPromises);
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('[ExternalNotificationService] Failed to send external notifications:', error)
    }
  }

  /**
   * Envoie une notification personnelle à un utilisateur spécifique
   */
  static async sendToUser(userId: number, event: string, payload: Omit<ExternalNotificationPayload, 'event'>) {
    try {
      const [user] = await db.select({
        whatsappNumber: users.whatsappNumber,
        telegramChatId: users.telegramChatId,
        discordWebhook: users.discordWebhook,
        customWebhook: users.customWebhook
      }).from(users).where(eq(users.id, userId)).limit(1)

      if (!user) return

      const fullPayload = { ...payload, event }
      const promises = []

      const [setting] = await db.select().from(settings).where(eq(settings.key, 'external_webhooks')).limit(1)
      let webhooks = []
      if (setting && setting.value) {
          webhooks = JSON.parse(setting.value)
      }

      // WhatsApp via Evolution API
      if (user.whatsappNumber) {
        const evo = webhooks.find((w: any) => w.type === 'evolution' && w.evolutionUrl)
        if (evo) {
            promises.push(this.sendEvolutionApi(evo, user.whatsappNumber, fullPayload))
        }
      }

      if (user.telegramChatId) {
        const telegramBot = webhooks.find((w: any) => w.type === 'telegram' && w.botToken)
        if (telegramBot) {
            promises.push(this.sendTelegram(telegramBot.botToken, user.telegramChatId, fullPayload))
        }
      }

      if (user.discordWebhook) {
        const discordSettings = webhooks.find((w: any) => w.type === 'discord')
        promises.push(this.sendDiscord({ url: user.discordWebhook, template: discordSettings?.template }, fullPayload))
      }

      if (user.customWebhook) {
        promises.push(this.sendCustom(user.customWebhook, fullPayload))
      }

      await Promise.allSettled(promises)

    } catch (error) {
      console.error('[ExternalNotificationService] Failed to send personal notification:', error)
    }
  }

  static async testWebhook(webhook: any, testType: 'movie' | 'tv' | 'default' = 'default', eventType: string = 'request_approved', currentUser?: any) {
    let payload: ExternalNotificationPayload = {
      title: 'Test de Notification',
      message: 'Ceci est un message de test depuis MediaHub.',
      event: eventType,
      data: { test: true }
    }

    // Récupère le pseudo Discord de l'admin s'il existe, sinon utilise '<@123456789012345678>' par défaut
    // S'il y a des cibles spécifiques dans le webhook, on va simuler un ping pour chacune d'elles
    let discordUser = currentUser?.discordUserId ? `<@${currentUser.discordUserId}>` : (currentUser?.name || currentUser?.email || 'Utilisateur Test')
    
    // Si on a des utilisateurs cibles (targetUsers) configurés dans le webhook
    if (webhook.targetUsers && webhook.targetUsers.length > 0) {
        try {
            const targetIds = webhook.targetUsers.map((id: string) => parseInt(id));
            const targetUsers = await db.select({
                discordUserId: users.discordUserId,
                name: users.name,
                email: users.email
            }).from(users).where(inArray(users.id, targetIds));
            
            if (targetUsers.length > 0) {
                // On crée une chaîne avec tous les pings ou les noms : "<@ID1>, Nom2"
                discordUser = targetUsers.map(u => u.discordUserId ? `<@${u.discordUserId}>` : (u.name || u.email)).join(', ');
            }
        } catch (e) {
            console.error('[ExternalNotificationService] Failed to fetch target users for test ping:', e);
        }
    }

    if (testType === 'movie') {
        payload = {
            title: 'Inception (2010)',
            message: 'Le film "Inception" (2010) vient d\'être ajouté au serveur et est maintenant disponible.',
            event: eventType,
            data: {
                tmdbId: 27205,
                mediaType: 'movie',
                title: 'Inception',
                year: '2010',
                overview: 'Dom Cobb est un voleur expérimenté – le meilleur qui soit dans l\'art périlleux de l\'extraction : sa spécialité consiste à s\'approprier les secrets les plus précieux d\'un individu, enfouis au plus profond de son subconscient, pendant qu\'il rêve et que son esprit est particulièrement vulnérable.',
                rating: '8.8',
                posterPath: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
                genres: 'Action, Science-Fiction, Aventure',
                quality: 'Bluray-1080p',
                size: '12.5 GB',
                release: 'Inception.2010.1080p.BluRay.x264-SPARKS',
                indexer: 'YGG',
                user: discordUser
            }
        }
    } else if (testType === 'tv') {
        payload = {
            title: 'Game of Thrones - S01E01',
            message: 'Un nouvel épisode de "Game of Thrones" est maintenant disponible : S01E01 - L\'hiver vient',
            event: eventType,
            data: {
                tmdbId: 1399,
                mediaType: 'tv',
                title: 'Game of Thrones',
                episodes: 'S01E01 - L\'hiver vient',
                overview: 'Le roi Robert Baratheon rend visite à son vieil ami Eddard Stark, dans le nord de Westeros, pour lui demander de devenir la nouvelle Main du Roi suite au décès mystérieux de Jon Arryn.',
                rating: '8.4',
                posterPath: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
                genres: 'Science-Fiction & Fantastique, Drame, Action & Adventure',
                quality: 'Bluray-1080p',
                size: '4.2 GB',
                release: 'Game.of.Thrones.S01E01.Winter.is.Coming.1080p.BluRay.x265-RARBG',
                indexer: 'Sharewood',
                user: discordUser
            }
        }
    }

    return this.dispatchWebhook(webhook, payload, true, currentUser)
  }

  private static async dispatchWebhook(webhook: any, payload: ExternalNotificationPayload, isTest = false, currentUser?: any): Promise<{success: boolean, error?: string}> {
    try {
      if (webhook.type === 'discord') {
        return await this.sendDiscord(webhook, payload)
      } else if (webhook.type === 'telegram') {
        return await this.sendTelegram(webhook.botToken, webhook.chatId, payload)
      } else if (webhook.type === 'evolution') {
        // Envoi global de test (utilise le numéro fourni dans le webhook, ou le numéro de l'utilisateur courant s'il existe)
        const testPhone = webhook.whatsappNumber || currentUser?.whatsappNumber || '33612345678'
        return await this.sendEvolutionApi(webhook, testPhone, payload)
      } else if (webhook.type === 'custom') {
        return await this.sendCustom(webhook.url, payload)
      }
      return { success: false, error: 'Type de webhook inconnu' }
    } catch (error: any) {
      if (isTest) {
        throw new Error(error.message || 'Erreur réseau lors de l\'envoi')
      }
      console.error(`[ExternalNotificationService] Failed to dispatch ${webhook.type} webhook:`, error)
      return { success: false, error: error.message }
    }
  }

  private static async sendDiscord(webhook: any, payload: ExternalNotificationPayload) {
    if (!webhook.url) throw new Error('URL Discord manquante')

    // Formater pour Discord
    let color = 5814783 // Blurple
    if (payload.event === 'media_request') color = 3447003 // Blue
    else if (payload.event === 'request_approved') color = 5763719 // Green
    else if (payload.event === 'user_created') color = 15548997 // Red/Pink
    else if (payload.event === 'account_request') color = 16776960 // Yellow

    let imageUrl: string | undefined
    if (payload.data?.posterPath) {
        imageUrl = payload.data.posterPath.startsWith('http') 
            ? payload.data.posterPath 
            : `https://image.tmdb.org/t/p/w500${payload.data.posterPath.startsWith('/') ? '' : '/'}${payload.data.posterPath}`
        
        // Log to debug URL
        console.log('[Discord Webhook] Resolved Image URL:', imageUrl)
    }

    let embed: any = {
      color: color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MediaHub'
      }
    }

    // Default rich format based on available data
    if (payload.data && payload.event === 'request_approved') {
        const d = payload.data;
        const isMovie = d.mediaType === 'movie';
        
        // Remove Radarr/Sonarr author
        // embed.author = {
        //     name: isMovie ? 'Radarr' : 'Sonarr',
        //     icon_url: isMovie ? 'https://raw.githubusercontent.com/Radarr/Radarr/develop/Logo/128.png' : 'https://raw.githubusercontent.com/Sonarr/Sonarr/develop/Logo/128.png'
        // }

        const titleText = isMovie 
            ? `${d.title} (${d.year || ''})` 
            : `${d.title} - ${d.episodes || ''}`

        embed.title = titleText;
        
        // Link title if possible
        if (d.tmdbId) {
            const tmdbType = isMovie ? 'movie' : 'tv';
            embed.url = `https://www.themoviedb.org/${tmdbType}/${d.tmdbId}`;
        }

        embed.description = isMovie ? 'Film Disponible' : 'Episode Téléchargé';
        
        embed.fields = [];

        if (d.overview) {
            embed.fields.push({
                name: 'Résumé',
                value: d.overview.length > 300 ? d.overview.substring(0, 297) + '...' : d.overview,
                inline: false
            });
        }

        if (d.rating) {
            embed.fields.push({ name: 'Note', value: d.rating, inline: false });
        }
        
        if (d.genres) {
            embed.fields.push({ name: 'Genres', value: d.genres, inline: false });
        }

        if (d.user) {
            embed.fields.push({ name: 'Demandé par', value: d.user, inline: false });
        }

        // Add technical info in a row
        if (d.quality || d.size) {
            if (d.quality) embed.fields.push({ name: 'Qualité', value: d.quality, inline: true });
            if (d.size) embed.fields.push({ name: 'Taille', value: d.size, inline: true });
        }

        if (d.indexer) {
            embed.fields.push({ name: 'Indexeur', value: d.indexer, inline: true });
        }

        if (d.release) {
            embed.fields.push({ name: 'Release', value: `\`${d.release}\``, inline: false });
        }

        if (imageUrl) {
            embed.image = { url: imageUrl };
            // Ensure thumbnail is removed if it was set previously
            delete embed.thumbnail;
        }
    } else {
        // Fallback for other events
        embed.title = payload.title;
        embed.description = payload.message;
        if (imageUrl) {
            embed.image = { url: imageUrl };
        }
    }

    // Custom override if user provided a template
    // We check webhook.templates[payload.event] specifically, fallback to webhook.template for older setups
    const templateToUse = webhook.templates?.[payload.event] !== undefined ? webhook.templates[payload.event] : webhook.template;
    const includeImage = webhook.includeImage?.[payload.event] !== false; // True par défaut

    if (templateToUse) {
        embed = {
            color: color,
            timestamp: new Date().toISOString(),
            description: templateToUse
                .replace(/\{title\}/g, payload.title || payload.data?.title || '')
                .replace(/\{message\}/g, payload.message || '')
                .replace(/\{year\}/g, payload.data?.year || '')
                .replace(/\{overview\}/g, payload.data?.overview || '')
                .replace(/\{rating\}/g, payload.data?.rating || '')
                .replace(/\{user\}/g, payload.data?.user || '')
                .replace(/\{episodes\}/g, payload.data?.episodes || '')
                .replace(/\{quality\}/g, payload.data?.quality || '')
                .replace(/\{size\}/g, payload.data?.size || '')
                .replace(/\{indexer\}/g, payload.data?.indexer || '')
                .replace(/\{release\}/g, payload.data?.release || '')
                .replace(/\{genres\}/g, payload.data?.genres || '')
                .replace(/\{poster\}/g, imageUrl || ''),
            image: (imageUrl && includeImage) ? { url: imageUrl } : undefined,
            footer: {
                text: `Event: ${payload.event}`
            }
        }
    } else if (!includeImage) {
        // If no custom template but image is disabled
        delete embed.image;
        delete embed.thumbnail;
    }

    const discordPayload: any = {
      username: 'MediaHub',
      avatar_url: 'https://raw.githubusercontent.com/walkxhub/Dashboard-Icons/main/png/mediahub.png', // Optional default avatar
      embeds: [embed]
    }

    // Si on a des mentions Discord (<@ID>) dans le champ user, on les met dans le content pour déclencher une vraie notification (ping)
    const userString = payload.data?.user || '';
    const mentions = userString.match(/<@[0-9]+>/g);
    if (mentions) {
        discordPayload.content = mentions.join(' ');
    }

    console.log('[Discord Webhook] Final payload:', JSON.stringify(discordPayload, null, 2))

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload)
    })

    if (!res.ok) {
      throw new Error(`Erreur Discord: ${res.status} ${res.statusText}`)
    }

    return { success: true }
  }

  private static async sendTelegram(botToken: string, chatId: string, payload: ExternalNotificationPayload) {
    if (!botToken || !chatId) throw new Error('Token ou Chat ID Telegram manquant')

    let text = `*${payload.title}*\n\n${payload.message}`

    // Nettoyage de l'utilisateur pour Telegram
    let cleanUserForTemplate = payload.data?.user || '';
    if (cleanUserForTemplate) {
        const mentions = cleanUserForTemplate.match(/<@[0-9]+>/g);
        if (mentions) {
            const discordIds = mentions.map((m: string) => m.replace(/[^0-9]/g, ''));
            const usersList = await db.select({
                name: users.name,
                email: users.email,
                discordUserId: users.discordUserId
            }).from(users).where(inArray(users.discordUserId, discordIds));
            
            for (const m of mentions) {
                const id = m.replace(/[^0-9]/g, '');
                const u = usersList.find((user: {discordUserId: string | null}) => user.discordUserId === id);
                const replacementName = u ? (u.name || u.email || 'Un utilisateur') : 'Un utilisateur';
                cleanUserForTemplate = cleanUserForTemplate.replace(m, replacementName);
            }
        }
        cleanUserForTemplate = cleanUserForTemplate.replace(/@([a-zA-Z0-9_.-]+)/g, '$1');
    }
    
    // Si on a des données enrichies (comme pour Discord)
    if (payload.data && ['request_approved', 'media_grabbed', 'media_downloaded', 'media_available', 'media_deleted'].includes(payload.event)) {
      const d = payload.data
      const isMovie = d.mediaType === 'movie'
      
      const titleText = isMovie 
          ? `${d.title} (${d.year || ''})` 
          : `${d.title} - ${d.episodes || ''}`

      let headerStatus = ''
      switch(payload.event) {
          case 'media_grabbed': headerStatus = '📥 Envoi au téléchargement'; break;
          case 'media_downloaded': headerStatus = '✅ Téléchargement terminé'; break;
          case 'media_available': 
          case 'request_approved': headerStatus = isMovie ? '🍿 Film Disponible' : '📺 Episode Disponible'; break;
          case 'media_deleted': headerStatus = '🗑️ Média Supprimé'; break;
      }

      text = `🎬 *${titleText}*\n\n`
      text += `${headerStatus}\n\n`
      
      if (d.overview) {
          text += `*Résumé:*\n${d.overview.length > 300 ? d.overview.substring(0, 297) + '...' : d.overview}\n\n`
      }

      if (d.rating) text += `⭐ *Note:* ${d.rating}\n`
      if (d.genres) text += `🎭 *Genres:* ${d.genres}\n`
      
      if (d.user) {
          text += `👤 *Demandé par:* ${cleanUserForTemplate}\n`
      }

      text += `\n`
      if (d.quality) text += `🏷️ *Qualité:* ${d.quality}\n`
      if (d.size) text += `💾 *Taille:* ${d.size}\n`
      if (d.indexer) text += `🔍 *Indexeur:* ${d.indexer}\n`
      if (d.release) text += `📦 *Release:* ${d.release}\n`
    }
    
    // S'il y a un paramètre webhook (passé à l'avenir) on pourrait remplacer les templates ici
    // Mais sendTelegram ne prend pas 'webhook' en argument, il prend botToken et chatId
    // On laisse comme ça, ça formatte joliment pour telegram au lieu d'un message brut
    
    // Si on a une image, on envoie une photo avec caption
    let url = `https://api.telegram.org/bot${botToken}/sendMessage`
    let body: any = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    }

    if (payload.data?.posterPath) {
        const imageUrl = payload.data.posterPath.startsWith('http') 
            ? payload.data.posterPath 
            : `https://image.tmdb.org/t/p/w500${payload.data.posterPath}`
            
        url = `https://api.telegram.org/bot${botToken}/sendPhoto`
        body = {
            chat_id: chatId,
            photo: imageUrl,
            caption: text,
            parse_mode: 'Markdown'
        }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(`Erreur Telegram: ${errData.description || res.statusText}`)
    }

    return { success: true }
  }

  private static async sendCustom(url: string, payload: ExternalNotificationPayload) {
    if (!url) throw new Error('URL du Webhook manquante')

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      throw new Error(`Erreur Webhook: ${res.status} ${res.statusText}`)
    }

    return { success: true }
  }

  private static async sendEvolutionApi(webhook: any, phone: string, payload: ExternalNotificationPayload) {
    if (!webhook.evolutionUrl || !webhook.evolutionInstance || !webhook.evolutionApiKey) {
      throw new Error('Configuration Evolution API incomplète')
    }

    try {
      // Clean phone number for WhatsApp (remove + and spaces)
      const cleanPhone = phone.replace(/[^0-9]/g, '')

      let text = `*${payload.title}*\n\n${payload.message}`

      // Convertir les mentions Discord (<@ID>) en noms d'utilisateurs lisibles pour WhatsApp
      let cleanUserForTemplate = payload.data?.user || '';
      if (cleanUserForTemplate) {
          const mentions = cleanUserForTemplate.match(/<@[0-9]+>/g);
          if (mentions) {
              const discordIds = mentions.map((m: string) => m.replace(/[^0-9]/g, ''));
              const usersList = await db.select({
                  name: users.name,
                  email: users.email,
                  discordUserId: users.discordUserId
              }).from(users).where(inArray(users.discordUserId, discordIds));
              
              for (const m of mentions) {
                  const id = m.replace(/[^0-9]/g, '');
                  const u = usersList.find((user: {discordUserId: string | null}) => user.discordUserId === id);
                  const replacementName = u ? (u.name || u.email || 'Un utilisateur') : 'Un utilisateur';
                  cleanUserForTemplate = cleanUserForTemplate.replace(m, replacementName);
              }
          }
          // Nettoyer les pseudos avec @ (si format @pseudo)
          cleanUserForTemplate = cleanUserForTemplate.replace(/@([a-zA-Z0-9_.-]+)/g, '$1');
      }

      // Si on a des données enrichies (comme pour Discord)
      if (payload.data && ['request_approved', 'media_grabbed', 'media_downloaded', 'media_available', 'media_deleted'].includes(payload.event)) {
        const d = payload.data
        const isMovie = d.mediaType === 'movie'
        
        const titleText = isMovie 
            ? `${d.title} (${d.year || ''})` 
            : `${d.title} - ${d.episodes || ''}`

        let headerStatus = ''
        switch(payload.event) {
            case 'media_grabbed': headerStatus = '📥 Envoi au téléchargement'; break;
            case 'media_downloaded': headerStatus = '✅ Téléchargement terminé'; break;
            case 'media_available': 
            case 'request_approved': headerStatus = isMovie ? '🍿 Film Disponible' : '📺 Episode Disponible'; break;
            case 'media_deleted': headerStatus = '🗑️ Média Supprimé'; break;
        }

        text = `🎬 *${titleText}*\n\n`
        text += `${headerStatus}\n\n`
        
        if (d.overview) {
            text += `*Résumé:*\n${d.overview.length > 300 ? d.overview.substring(0, 297) + '...' : d.overview}\n\n`
        }

        if (d.rating) text += `⭐ *Note:* ${d.rating}\n`
        if (d.genres) text += `🎭 *Genres:* ${d.genres}\n`
        
        if (d.user) {
            text += `👤 *Demandé par:* ${cleanUserForTemplate}\n`
        }

        text += `\n`
        if (d.quality) text += `🏷️ *Qualité:* ${d.quality}\n`
        if (d.size) text += `💾 *Taille:* ${d.size}\n`
        if (d.indexer) text += `🔍 *Indexeur:* ${d.indexer}\n`
        if (d.release) text += `📦 *Release:* ${d.release}\n`
      }

      // Surcharge via template personnalisé si défini
      const templateToUse = webhook.templates?.[payload.event] !== undefined ? webhook.templates[payload.event] : webhook.template;
      if (templateToUse) {
          text = templateToUse
            .replace(/\{title\}/g, payload.title || payload.data?.title || '')
            .replace(/\{message\}/g, payload.message || '')
            .replace(/\{year\}/g, payload.data?.year || '')
            .replace(/\{overview\}/g, payload.data?.overview || '')
            .replace(/\{rating\}/g, payload.data?.rating || '')
            .replace(/\{user\}/g, cleanUserForTemplate)
            .replace(/\{episodes\}/g, payload.data?.episodes || '')
            .replace(/\{quality\}/g, payload.data?.quality || '')
            .replace(/\{size\}/g, payload.data?.size || '')
            .replace(/\{indexer\}/g, payload.data?.indexer || '')
            .replace(/\{release\}/g, payload.data?.release || '')
            .replace(/\{genres\}/g, payload.data?.genres || '')
            .replace(/\{poster\}/g, payload.data?.posterPath ? (payload.data.posterPath.startsWith('http') ? payload.data.posterPath : `https://image.tmdb.org/t/p/w500${payload.data.posterPath}`) : '')
      }

      let endpoint = '/message/sendText/'
      let body: any = {
        number: cleanPhone,
        text: text
      }

      const includeImage = webhook.includeImage?.[payload.event] !== false; // True par défaut

      // Si on a une image et que l'option n'est pas désactivée, on l'envoie via sendMedia
      if (payload.data?.posterPath && includeImage) {
        const imageUrl = payload.data.posterPath.startsWith('http') 
            ? payload.data.posterPath 
            : `https://image.tmdb.org/t/p/w500${payload.data.posterPath}`
            
        endpoint = '/message/sendMedia/'
        body = {
          number: cleanPhone,
          mediatype: 'image',
          media: imageUrl,
          caption: text
        }
      }

      // S'assurer que l'URL ne finit pas par un slash
      const baseUrl = webhook.evolutionUrl.replace(/\/$/, '')
      const url = `${baseUrl}${endpoint}${webhook.evolutionInstance}`
      
      const res = await fetch(url, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': webhook.evolutionApiKey
        },
        body: JSON.stringify(body)
      })
      
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`Erreur Evolution API (${res.status}): ${errText}`)
      }
      return { success: true }
    } catch (e: any) {
      console.error('Evolution API Error:', e)
      throw e
    }
  }
}
