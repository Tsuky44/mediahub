import type { AppAbility } from '@/lib/ability'
import type { NavItem, NavbarConfigStatus } from '../_types/navbar'

/**
 * Filter navigation items based on the user's abilities and the runtime
 * configuration status (downloads can be disabled at the system
 * level even if the user has the permission).
 */
export function filterNavigationItems(
  items: NavItem[],
  ability: AppAbility,
  configStatus?: NavbarConfigStatus
): NavItem[] {
  return items.filter((item) => {
    if (item.href === '/dashboard/downloads') {
      if (configStatus && !configStatus.hasDownloads) return false
      return ability.can('read', 'Downloads')
    }
    if (item.href === '/dashboard/stats') {
      return ability.can('read', 'Stats')
    }
    if (item.href === '/dashboard/requests') {
      return ability.can('read', 'Media')
    }
    if (item.href === '/dashboard/requests/list') {
      return ability.can('read', 'MediaRequest')
    }
    if (item.href === '/dashboard') return true
    if (item.href === '/dashboard/media') {
      return ability.can('read', 'Library')
    }
    return true
  })
}
