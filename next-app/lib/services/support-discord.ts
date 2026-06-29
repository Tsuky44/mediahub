import { logger } from '@/lib/logger';
import https from 'https';
import { URL } from 'url';

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
}

export interface DiscordPayload {
  content?: string;
  embeds: (DiscordEmbed & { image?: { url: string } })[];
}

/**
 * Transforme une string brute de mentions en mentions Discord valides.
 * Accepte des IDs bruts (wrappés en <@id>) ou des mentions déjà formatées.
 */
export function formatDiscordMentions(raw: string | null | undefined): string {
  if (!raw) return '';
  const tokens = raw.split(/[\s,]+/).filter(Boolean);
  const formatted = tokens.map((token) => {
    const t = token.trim();
    if (/^<@&?\d+>$/.test(t)) return t;
    if (/^\d+$/.test(t)) return `<@${t}>`;
    return t;
  });
  return formatted.join(' ');
}

export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const url = new URL(webhookUrl);
    const postData = JSON.stringify(payload);

    const result = await new Promise<{
      success: boolean;
      statusCode?: number;
      body?: string;
      error?: string;
    }>((resolve) => {
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          port: url.port || 443,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          // Force IPv4 — contourne le bug de timeout IPv6 de Node.js/undici
          family: 4,
          // Timeout plus long pour les connexions lentes
          timeout: 15000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, statusCode: res.statusCode });
            } else {
              resolve({
                success: false,
                statusCode: res.statusCode,
                body: data,
                error: `Discord webhook failed: ${res.statusCode} ${data}`,
              });
            }
          });
        }
      );

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout (15s)' });
      });

      req.write(postData);
      req.end();
    });

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[SupportDiscord] Failed to send webhook:', msg);
    return { success: false, error: msg };
  }
}

export function buildTicketEmbed(
  ticketId: string,
  categoryName: string,
  subcategoryName: string | null,
  message: string,
  userName: string | null,
  userEmail: string | null,
  status: string,
  baseUrl: string,
  attachments?: string[],
  mentions?: string | null
): DiscordPayload {
  const statusColors: Record<string, number> = {
    open: 0x10b981, // emerald-500
    in_progress: 0xf59e0b, // amber-500
    resolved: 0x3b82f6, // blue-500
    closed: 0x6b7280, // gray-500
  };

  const statusLabels: Record<string, string> = {
    open: 'Ouvert',
    in_progress: 'En cours',
    resolved: 'Résolu',
    closed: 'Fermé',
  };

  const fields = [
    { name: 'Catégorie', value: categoryName, inline: true },
    ...(subcategoryName ? [{ name: 'Sous-catégorie', value: subcategoryName, inline: true }] : []),
    { name: 'Statut', value: statusLabels[status] || status, inline: true },
    ...(userName ? [{ name: 'Utilisateur', value: userName, inline: true }] : []),
    ...(userEmail ? [{ name: 'Email', value: userEmail, inline: true }] : []),
    { name: 'Message', value: message.length > 1000 ? message.slice(0, 1000) + '...' : message, inline: false },
    ...(attachments && attachments.length > 0
      ? [{
          name: `Pièce${attachments.length > 1 ? 's' : ''} jointe${attachments.length > 1 ? 's' : ''}`,
          value: attachments.map((url) => {
            const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
            return `[Voir l'image](${absoluteUrl})`;
          }).join(' • '),
          inline: false,
        }]
      : []),
  ];

  const firstImageUrl = attachments && attachments.length > 0
    ? (attachments[0].startsWith('http') ? attachments[0] : `${baseUrl}${attachments[0]}`)
    : undefined;

  const embeds: (DiscordEmbed & { image?: { url: string } })[] = [
    {
      title: `Ticket #${ticketId.slice(-8).toUpperCase()}`,
      description: `Un nouveau ticket a été créé dans la catégorie **${categoryName}**.`,
      color: statusColors[status] || 0x6b7280,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: `MediaHub Support • ${ticketId}` },
      ...(firstImageUrl ? { image: { url: firstImageUrl } } : {}),
    },
  ];

  // Add extra embeds for remaining images so Discord displays them inline below the main embed
  if (attachments && attachments.length > 1) {
    attachments.slice(1).forEach((url) => {
      const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
      embeds.push({ image: { url: absoluteUrl } });
    });
  }

  const mentionsStr = formatDiscordMentions(mentions);
  return {
    content: mentionsStr
      ? `${mentionsStr}\nNouveau ticket de support : \`${ticketId}\``
      : `Nouveau ticket de support : \`${ticketId}\``,
    embeds,
  };
}
