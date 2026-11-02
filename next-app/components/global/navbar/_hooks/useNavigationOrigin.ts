'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { isDrillDownPath, resolveNavigationPath } from '../_utils/active-navigation'

const ORIGIN_KEY = 'mh-navigation-origin'

const subscribe = () => () => {}

function readOrigin(): string | null {
  try {
    return sessionStorage.getItem(ORIGIN_KEY)
  } catch {
    return null
  }
}

/** Last section page (with its query string) visited before opening a detail page. */
export function useStoredNavigationOrigin() {
  return useSyncExternalStore(subscribe, readOrigin, () => null)
}

/** Remembers the current section and returns the pathname the navigation should highlight. */
export function useNavigationOrigin(pathname: string) {
  const origin = useStoredNavigationOrigin()

  useEffect(() => {
    if (isDrillDownPath(pathname)) return
    try {
      sessionStorage.setItem(ORIGIN_KEY, `${pathname}${window.location.search}`)
    } catch {}
  }, [pathname])

  return resolveNavigationPath(pathname, origin)
}
