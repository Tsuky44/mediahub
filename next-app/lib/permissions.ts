
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const PERMISSIONS = {
  ADMIN_ACCESS: 'admin.access',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  ROLES_MANAGE: 'roles.manage',
  MEDIA_MANAGE: 'media.manage',
  REQUESTS_VIEW: 'requests.view',
  REQUESTS_CREATE: 'requests.create',
  REQUESTS_MANAGE: 'requests.manage',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
  LOGS_VIEW: 'logs.view',
  DOCKER_VIEW: 'docker.view',
  DOCKER_MANAGE: 'docker.manage',
  STATS_VIEW: 'stats.view',
  DOWNLOADS_VIEW: 'downloads.view',
  DOWNLOADS_MANAGE: 'downloads.manage',
  DASHBOARD_VIEW: 'dashboard.view',
} as const

export type PermissionName = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export async function hasPermission(permission: PermissionName): Promise<boolean> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return false
  
  // Admin always has access (or check specific permission)
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
