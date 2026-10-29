/**
 * Tests unitaires du TemplateRenderer.
 * Aucune dépendance externe (ni DB, ni réseau) : npx tsx template-renderer.test.ts
 *
 * Ces tests verrouillent les comportements qui ont causé des bugs en production :
 *  - un template personnalisé vidé doit rendre la main au template par défaut
 *  - une donnée absente ne doit jamais produire « N/A », « () » ni ligne orpheline
 *  - la syntaxe `[[ ]]` doit retirer le bloc ET son saut de ligne
 */

import { TemplateRenderer } from './template-renderer'
import type { NotificationEventPayload, EventRouteConfig, MediaInfo } from '../types'

function route(patch: Partial<EventRouteConfig> = {}): EventRouteConfig {
  return {
    enabled: true,
    templateMovie: '',
    templateTv: '',
    targetUserIds: [],
    targetNumbers: [],
    notifyRequester: true,
    includePoster: true,
    ...patch,
  }
}

function payload(media: Partial<MediaInfo>, extra: Partial<NotificationEventPayload> = {}): NotificationEventPayload {
  return {
    event: 'MEDIA_AVAILABLE',
    timestamp: '2026-08-26T10:00:00Z',
    correlationId: 'test-cid',
    media: {
      tmdbId: '12345',
      mediaType: 'movie',
      title: 'Avatar',
      ...media,
    },
    ...extra,
  }
}

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`❌ ${msg}\n   Attendu : ${JSON.stringify(expected)}\n   Obtenu  : ${JSON.stringify(actual)}`)
  }
}

function assertIncludes(haystack: string, needle: string, msg: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`❌ ${msg}\n   « ${needle} » absent de :\n${haystack}`)
  }
}

function assertExcludes(haystack: string, needle: string, msg: string) {
  if (haystack.includes(needle)) {
    throw new Error(`❌ ${msg}\n   « ${needle} » présent dans :\n${haystack}`)
  }
}

function runTests() {
  let passed = 0
  let failed = 0

  function test(name: string, fn: () => void) {
    try {
      fn()
      passed++
      console.log(`✅ ${name}`)
    } catch (e) {
      failed++
      console.error(e instanceof Error ? e.message : String(e))
    }
  }

  // ── Substitution de base ────────────────────────────────────────────────
  test('Remplace les variables présentes', () => {
    const out = TemplateRenderer.render(
      payload({ title: 'Avatar', year: '2024' }),
      route({ templateMovie: '{title} ({year})' })
    )
    assertEqual(out, 'Avatar (2024)', 'Substitution simple')
  })

  test('Une variable absente rend du vide, pas « N/A »', () => {
    const out = TemplateRenderer.render(
      payload({ title: 'Avatar' }),
      route({ templateMovie: 'x{year}x{rating}x{overview}x' })
    )
    assertEqual(out, 'xxxx', 'Aucun texte de remplacement')
  })

  // ── Blocs optionnels ────────────────────────────────────────────────────
  test('Bloc conservé quand toutes ses variables sont remplies', () => {
    const out = TemplateRenderer.render(
      payload({ year: '2024' }),
      route({ templateMovie: '{title}[[ ({year})]]' })
    )
    assertEqual(out, 'Avatar (2024)', 'Bloc inline rendu')
  })

  test('Bloc retiré quand une variable manque', () => {
    const out = TemplateRenderer.render(
      payload({}),
      route({ templateMovie: '{title}[[ ({year})]]' })
    )
    assertEqual(out, 'Avatar', "Pas de « () » vide")
  })

  test('Bloc de ligne retiré avec son saut de ligne', () => {
    const out = TemplateRenderer.render(
      payload({}),
      route({ templateMovie: 'A\n[[⭐ {rating}/10]]\nB' })
    )
    assertEqual(out, 'A\nB', 'Aucune ligne vide résiduelle')
  })

  test('Bloc à plusieurs variables : tout ou rien', () => {
    const tpl = '[[{quality} · {size}]]'
    const withBoth = TemplateRenderer.render(
      payload({}, { download: { quality: '2160p', size: '18 GB' } }),
      route({ templateMovie: tpl })
    )
    assertEqual(withBoth, '2160p · 18 GB', 'Les deux présentes → rendu')

    const withOne = TemplateRenderer.render(
      payload({}, { download: { quality: '2160p' } }),
      route({ templateMovie: tpl })
    )
    assertEqual(withOne, '', 'Une manquante → bloc retiré')
  })

  test('Bloc sans variable est du texte constant', () => {
    const out = TemplateRenderer.render(
      payload({}),
      route({ templateMovie: '[[toujours là]]' })
    )
    assertEqual(out, 'toujours là', 'Bloc littéral conservé')
  })

  // ── Choix du template ───────────────────────────────────────────────────
  test('Template personnalisé vide → template par défaut', () => {
    const out = TemplateRenderer.render(payload({}), route({ templateMovie: '' }))
    assertIncludes(out, 'Disponible sur le serveur', 'Le défaut prend le relais')
  })

  test('Template rempli d’espaces → template par défaut', () => {
    const out = TemplateRenderer.render(payload({}), route({ templateMovie: '   \n  ' }))
    assertIncludes(out, 'Disponible sur le serveur', 'Blancs traités comme vide')
  })

  test('Le champ legacy `template` est ignoré', () => {
    // Régression : tant qu'il servait de fallback, vider templateMovie dans
    // l'interface ne rétablissait jamais le template par défaut.
    const out = TemplateRenderer.render(
      payload({}),
      route({ templateMovie: '', template: '{title} dispo' })
    )
    assertExcludes(out, 'Avatar dispo', 'Legacy non consulté')
    assertIncludes(out, 'Disponible sur le serveur', 'Le défaut prend le relais')
  })

  test('La variante série est choisie pour un média tv', () => {
    const out = TemplateRenderer.render(
      payload({ mediaType: 'tv' }),
      route({ templateMovie: 'FILM', templateTv: 'SERIE' })
    )
    assertEqual(out, 'SERIE', 'Variante tv')
  })

  // ── Saisons ─────────────────────────────────────────────────────────────
  test('Libellés de saison — une seule saison', () => {
    const out = TemplateRenderer.render(
      payload({ mediaType: 'tv', seasonNumber: 2 }),
      route({ templateTv: '{season} | {seasonLabel}' })
    )
    assertEqual(out, 'S02 | Saison 2', 'Saison unique')
  })

  test('Libellés de saison — plage contiguë', () => {
    const out = TemplateRenderer.render(
      payload({ mediaType: 'tv', seasons: [1, 2, 3] }),
      route({ templateTv: '{season} | {seasonLabel}' })
    )
    assertEqual(out, 'S01-S03 | Saisons 1 à 3', 'Plage contiguë')
  })

  test('Libellés de saison — saisons disjointes', () => {
    const out = TemplateRenderer.render(
      payload({ mediaType: 'tv', seasons: [4, 1] }),
      route({ templateTv: '{season} | {seasonLabel}' })
    )
    assertEqual(out, 'S01,S04 | Saisons 1, 4', 'Disjointes triées')
  })

  // ── Poster ──────────────────────────────────────────────────────────────
  test('{poster} résout un chemin TMDB', () => {
    const out = TemplateRenderer.render(
      payload({ posterPath: '/abc.jpg' }),
      route({ templateMovie: '{poster}' })
    )
    assertEqual(out, 'https://image.tmdb.org/t/p/w500/abc.jpg', 'URL TMDB')
  })

  test('{poster} reste vide pour un chemin interne Sonarr/Radarr', () => {
    const out = TemplateRenderer.render(
      payload({ posterPath: '/MediaCover/42/poster.jpg' }),
      route({ templateMovie: 'x{poster}x' })
    )
    assertEqual(out, 'xx', 'Chemin interne non exposé')
  })

  // ── Défauts complets ────────────────────────────────────────────────────
  test('Défaut MEDIA_AVAILABLE riche quand tout est présent', () => {
    const out = TemplateRenderer.render(
      payload({
        title: 'Avatar',
        year: '2024',
        overview: 'Jake Sully...',
        genres: 'Science-fiction',
        rating: '7.8',
      }, { requester: { id: 1, name: 'Mathis' } })
    )
    assertIncludes(out, 'Avatar', 'Titre')
    assertIncludes(out, '(2024)', 'Année')
    assertIncludes(out, 'Mathis', 'Demandeur')
    assertIncludes(out, 'Science-fiction', 'Genres')
    assertIncludes(out, '7.8/10', 'Note')
    assertIncludes(out, 'Jake Sully...', 'Synopsis')
  })

  test('Défaut MEDIA_AVAILABLE dégrade proprement sans métadonnées', () => {
    const out = TemplateRenderer.render(payload({ title: 'Avatar' }))
    assertIncludes(out, 'Avatar', 'Titre conservé')
    assertExcludes(out, '()', 'Pas de parenthèses vides')
    assertExcludes(out, 'N/A', 'Pas de N/A')
    assertExcludes(out, '/10', 'Pas de note orpheline')
    assertExcludes(out, '\n\n\n', 'Pas de trou de lignes vides')
  })

  test('SEASON_DOWNLOAD_COMPLETE ne laisse pas fuiter de syntaxe', () => {
    // Régression : l'ancien template utilisait `{a && texte}`, une syntaxe que
    // le moteur ne connaissait pas et qui partait telle quelle dans le message.
    const p = payload({ mediaType: 'tv', title: 'The Last of Us', seasons: [2] }, {
      event: 'SEASON_DOWNLOAD_COMPLETE',
    })
    ;(p as unknown as Record<string, unknown>).episodesDownloaded = [1, 2, 3]
    ;(p as unknown as Record<string, unknown>).totalEpisodes = 7

    const out = TemplateRenderer.render(p)
    assertIncludes(out, 'E1,E2,E3', 'Épisodes listés')
    assertExcludes(out, '&&', 'Aucune syntaxe résiduelle')
    assertExcludes(out, '{', 'Aucune accolade non résolue')
    assertExcludes(out, 'Échecs', "Bloc d'échecs retiré quand vide")
  })

  test('Un event sans variante film retombe sur la variante série', () => {
    const out = TemplateRenderer.render(
      payload({ mediaType: 'movie' }, { event: 'SEASON_AVAILABLE' })
    )
    assertIncludes(out, 'Saison disponible', 'Pas de message vide')
  })

  console.log(`\n${passed} réussis, ${failed} échoués`)
  if (failed > 0) process.exit(1)
}

runTests()
