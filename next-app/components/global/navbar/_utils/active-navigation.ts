import type { NavItem } from '../_types/navbar'

/** Only the most specific visible destination is active (requests vs requests/list). */
export function isNavigationItemActive(href: string, pathname: string, items: NavItem[]) {
  const match = items
    .filter(item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]
  return match?.href === href
}

/** Detail pages reachable from any section (media, collection, discover, person). */
export function isDrillDownPath(pathname: string) {
  return pathname.startsWith('/dashboard/media/') || pathname.startsWith('/dashboard/person/')
}

/** On a detail page, the navigation keeps highlighting the section the user came from. */
export function resolveNavigationPath(pathname: string, origin: string | null) {
  if (!origin || !isDrillDownPath(pathname)) return pathname
  return origin.split('?')[0]
}
