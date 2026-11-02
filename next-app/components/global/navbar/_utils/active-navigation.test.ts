import assert from 'node:assert/strict'
import test from 'node:test'
import { isNavigationItemActive, resolveNavigationPath } from './active-navigation'
import { filterNavigationItems } from './filter-navigation'
import { NAVIGATION_ITEMS } from '../_constants/navigation-items'

test('the request follow-up page highlights only its own destination', () => {
  const active = NAVIGATION_ITEMS.filter(item => isNavigationItemActive(item.href, '/dashboard/requests/list', NAVIGATION_ITEMS))
  assert.deepEqual(active.map(item => item.href), ['/dashboard/requests/list'])
})

test('media detail routes retain their library navigation context', () => {
  const active = NAVIGATION_ITEMS.filter(item => isNavigationItemActive(item.href, '/dashboard/media/123', NAVIGATION_ITEMS))
  assert.deepEqual(active.map(item => item.href), ['/dashboard/media'])
})

test('a media opened from the requests tab keeps the requests tab active', () => {
  const pathname = resolveNavigationPath('/dashboard/media/123', '/dashboard/requests?filter=movie')
  const active = NAVIGATION_ITEMS.filter(item => isNavigationItemActive(item.href, pathname, NAVIGATION_ITEMS))
  assert.deepEqual(active.map(item => item.href), ['/dashboard/requests'])
  assert.equal(resolveNavigationPath('/dashboard/stats', '/dashboard/requests'), '/dashboard/stats')
})

test('disabled services and unavailable permissions do not create sidebar destinations', () => {
  const ability = { can: (_action: string, subject: string) => ['Media', 'Library'].includes(subject) }
  const visible = filterNavigationItems(NAVIGATION_ITEMS, ability as Parameters<typeof filterNavigationItems>[1], { hasDownloads: false })
  assert.deepEqual(visible.map(item => item.href), ['/dashboard', '/dashboard/requests', '/dashboard/media'])
})
