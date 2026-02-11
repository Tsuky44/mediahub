
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const PERMISSIONS = {
  // Système & Admin Global
  ADMIN_ACCESS: 'admin.access',        // Accès au dashboard admin général
  SETTINGS_VIEW: 'settings.view',      // Voir les paramètres globaux
  SETTINGS_MANAGE: 'settings.manage',  // Modifier les paramètres
  LOGS_VIEW: 'logs.view',              // Voir les logs système/audit

  // Gestion des Utilisateurs & Rôles
  USERS_VIEW: 'users.view',            // Voir la liste des utilisateurs
  USERS_MANAGE: 'users.manage',        // Créer/Modifier/Bannir utilisateurs
  ROLES_MANAGE: 'roles.manage',        // Créer/Modifier rôles & permissions

  // Module Infrastructure (Docker)
  DOCKER_VIEW: 'docker.view',              // Voir les conteneurs
  DOCKER_MANAGE: 'docker.manage',          // Démarrer/Arrêter/Redémarrer
  DOCKER_CONSOLE: 'docker.console',        // Accès au terminal/logs

  // Module Téléchargements (Downloads)
  DOWNLOADS_VIEW: 'downloads.view',        // Accès à l'onglet Téléchargements
  DOWNLOADS_ADD: 'downloads.add',          // Ajouter/Rechercher des torrents
  DOWNLOADS_MANAGE: 'downloads.manage',    // Pause/Resume/Stop torrents
  DOWNLOADS_DELETE: 'downloads.delete',    // Supprimer des torrents
  FILES_VIEW: 'files.view',                // Voir l'explorateur de fichiers
  FILES_MANAGE: 'files.manage',            // Renommer/Déplacer/Supprimer fichiers bruts
  FILES_SHARE: 'files.share',              // Créer des liens de partage

  // Module Médias (Catalogue)
  MEDIA_VIEW: 'media.view',            // Voir le catalogue (Films/Séries)
  MEDIA_PLAY: 'media.play',            // Lire le contenu
  MEDIA_MANAGE: 'media.manage',        // Actions admin sur média (Refresh metadata, Scan)
  MEDIA_DELETE: 'media.delete',        // Supprimer un média de la librairie

  // Module Demandes (Requests)
  REQUESTS_SEARCH_VIEW: 'requests.search.view',   // Accès à l'onglet Demander (Recherche)
  REQUESTS_LIST_VIEW: 'requests.list.view',       // Accès à l'onglet Mes demandes (Lecture seule)
  REQUESTS_LIST_MANAGE: 'requests.list.manage',   // Gérer les demandes dans la liste (Retry/Delete)
  REQUESTS_DETAILS_MANAGE: 'requests.details.manage', // Menu de gestion sur les détails (Admin actions)
  REQUESTS_INTERACTIVE: 'requests.interactive',   // Utiliser la recherche interactive

  // Module Statistiques
  STATS_VIEW_GLOBAL: 'stats.view_global',  // Voir les stats globales
  STATS_VIEW_SELF: 'stats.view_self',      // Voir ses propres stats
} as const

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export async function hasPermission(permission: PermissionName): Promise<boolean> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return false
  
  // Admin system check (fallback si le rôle admin a tout, mais idéalement on check les perms)
  if ((session.user as any).role === 'admin') return true

  const userPermissions = (session.user as any).permissions || []
  return userPermissions.includes(permission)
}

export async function checkPermission(permission: PermissionName) {
  const allowed = await hasPermission(permission)
  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`)
  }
}
