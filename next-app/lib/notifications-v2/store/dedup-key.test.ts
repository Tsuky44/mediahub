/**
 * Tests unitaires pour buildDedupKey et parseDedupKey.
 * Exécutable sans framework externe: node --test dedup-key.test.ts (Node 20+)
 * ou via npx tsx dedup-key.test.ts
 */

import { buildDedupKey, parseDedupKey } from './dedup-key'
import type { NotificationEvent, MediaInfo, RequesterInfo } from '../types'

const MOVIE_MEDIA: MediaInfo = {
  tmdbId: '12345',
  mediaType: 'movie',
  title: 'Test Movie',
}

const TV_MEDIA: MediaInfo = {
  tmdbId: '67890',
  mediaType: 'tv',
  title: 'Test Series',
}

const REQUESTER: RequesterInfo = {
  id: 42,
  name: 'Alice',
}

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`❌ ${msg}\n   Expected: ${expected}\n   Actual:   ${actual}`)
  }
}

function runTests() {
  let passed = 0
  let failed = 0

  function test(name: string, fn: () => void) {
    try {
      fn()
      passed++
    } catch (e) {
      failed++
      console.error((e as Error).message)
    }
  }

  test('buildDedupKey avec requester.id (movie)', () => {
    const key = buildDedupKey('MEDIA_GRABBED' as NotificationEvent, MOVIE_MEDIA, REQUESTER)
    assertEqual(key, 'req:42:MEDIA_GRABBED', 'Doit utiliser le pattern req:<id>:<event>')
  })

  test('buildDedupKey avec requester.id + season', () => {
    const key = buildDedupKey('MEDIA_AVAILABLE' as NotificationEvent, { ...TV_MEDIA, seasonNumber: 1 }, REQUESTER)
    assertEqual(key, 'req:42:MEDIA_AVAILABLE:S1', 'Doit ajouter :S<season> pour les séries')
  })

  test('buildDedupKey sans requester (fallback TMDB movie)', () => {
    const key = buildDedupKey('MEDIA_AVAILABLE' as NotificationEvent, MOVIE_MEDIA, undefined)
    assertEqual(key, 'tmdb:movie:12345:MEDIA_AVAILABLE', 'Doit utiliser le pattern tmdb:<type>:<id>:<event>')
  })

  test('buildDedupKey TV sans seasonNumber', () => {
    const key = buildDedupKey('MEDIA_GRABBED' as NotificationEvent, TV_MEDIA, undefined)
    assertEqual(key, 'tmdb:tv:67890:MEDIA_GRABBED', 'Ne doit pas ajouter de seasonNumber si absent')
  })

  test('buildDedupKey TV avec seasonNumber', () => {
    const key = buildDedupKey('MEDIA_AVAILABLE' as NotificationEvent, { ...TV_MEDIA, seasonNumber: 3 }, undefined)
    assertEqual(key, 'tmdb:tv:67890:MEDIA_AVAILABLE:S3', 'Doit ajouter :S<season> pour les séries')
  })

  test('buildDedupKey SEASON_PARTIALLY_AVAILABLE', () => {
    const key = buildDedupKey('SEASON_PARTIALLY_AVAILABLE' as NotificationEvent, { ...TV_MEDIA, seasonNumber: 2 }, undefined)
    assertEqual(key, 'tmdb:tv:67890:SEASON_PARTIALLY_AVAILABLE:S2', 'Doit inclure seasonNumber dans la clé')
  })

  test('buildDedupKey MEDIA_FAILED avec stage', () => {
    const key = buildDedupKey('MEDIA_FAILED' as NotificationEvent, MOVIE_MEDIA, undefined, 'import')
    assertEqual(key, 'tmdb:movie:12345:MEDIA_FAILED:import', 'Doit ajouter le stage pour MEDIA_FAILED')
  })

  test('buildDedupKey MEDIA_FAILED TV avec season + stage', () => {
    const key = buildDedupKey('MEDIA_FAILED' as NotificationEvent, { ...TV_MEDIA, seasonNumber: 1 }, undefined, 'download')
    assertEqual(key, 'tmdb:tv:67890:MEDIA_FAILED:S1:download', 'Doit inclure season ET stage')
  })

  test('parseDedupKey request', () => {
    const parsed = parseDedupKey('req:99:MEDIA_DOWNLOADING')
    assertEqual(parsed.type, 'request', 'Type doit être request')
    assertEqual(parsed.requestId, 99, 'RequestId doit être 99')
    assertEqual(parsed.event, 'MEDIA_DOWNLOADING', 'Event doit être MEDIA_DOWNLOADING')
    assertEqual((parsed as { seasonNumber?: number }).seasonNumber, undefined, 'SeasonNumber doit être undefined')
  })

  test('parseDedupKey request avec season', () => {
    const parsed = parseDedupKey('req:42:MEDIA_AVAILABLE:S1')
    assertEqual(parsed.type, 'request', 'Type doit être request')
    assertEqual(parsed.requestId, 42, 'RequestId doit être 42')
    assertEqual(parsed.event, 'MEDIA_AVAILABLE', 'Event doit être MEDIA_AVAILABLE')
    assertEqual((parsed as { seasonNumber?: number }).seasonNumber, 1, 'SeasonNumber doit être 1')
  })

  test('parseDedupKey tmdb sans season', () => {
    const parsed = parseDedupKey('tmdb:tv:55555:MEDIA_IMPORTING')
    assertEqual(parsed.type, 'tmdb', 'Type doit être tmdb')
    assertEqual(parsed.mediaType, 'tv', 'mediaType doit être tv')
    assertEqual(parsed.tmdbId, '55555', 'tmdbId doit être 55555')
    assertEqual(parsed.event, 'MEDIA_IMPORTING', 'Event doit être MEDIA_IMPORTING')
    assertEqual((parsed as { seasonNumber?: number }).seasonNumber, undefined, 'SeasonNumber doit être undefined')
  })

  test('parseDedupKey tmdb avec season', () => {
    const parsed = parseDedupKey('tmdb:tv:55555:MEDIA_AVAILABLE:S2')
    assertEqual(parsed.type, 'tmdb', 'Type doit être tmdb')
    assertEqual((parsed as { seasonNumber?: number }).seasonNumber, 2, 'SeasonNumber doit être 2')
    assertEqual(parsed.event, 'MEDIA_AVAILABLE', 'Event doit être MEDIA_AVAILABLE')
  })

  test('parseDedupKey tmdb avec season + stage', () => {
    const parsed = parseDedupKey('tmdb:tv:12345:MEDIA_FAILED:S1:grab')
    assertEqual(parsed.type, 'tmdb', 'Type doit être tmdb')
    assertEqual((parsed as { seasonNumber?: number }).seasonNumber, 1, 'SeasonNumber doit être 1')
    assertEqual(parsed.stage, 'grab', 'Stage doit être grab')
  })

  test('parseDedupKey unknown', () => {
    const parsed = parseDedupKey('invalid:key')
    assertEqual(parsed.type, 'unknown', 'Type doit être unknown')
  })

  console.log(`\nDedupKey tests: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

runTests()
