import type { NotificationEvent } from '@/lib/notifications-v2'

export interface UserOption {
  id: number
  name: string
  email: string
  hasWhatsapp: boolean
}

export const EVENT_LABELS: Record<NotificationEvent, string> = {
  MEDIA_REQUESTED: 'Nouvelle demande',
  MEDIA_APPROVED: 'Demande approuvée',
  MEDIA_IMPORTING: 'Téléchargement terminé (import)',
  MEDIA_AVAILABLE: 'Média disponible (Emby)',
  MEDIA_FAILED: 'Échec',
}

export const EVENT_ORDER: NotificationEvent[] = [
  'MEDIA_REQUESTED',
  'MEDIA_APPROVED',
  'MEDIA_IMPORTING',
  'MEDIA_AVAILABLE',
  'MEDIA_FAILED',
]
