/**
 * Tests unitaires de la normalisation de config (aucune dépendance base).
 *   npx tsx config-defaults.test.ts
 *
 * Le scénario central est celui qui a cassé la personnalisation des templates :
 * une config en base contenant l'ancien champ `template` réinjectait sa valeur
 * dans `templateMovie` à CHAQUE chargement, si bien que vider le champ dans
 * l'interface n'avait aucun effet durable.
 */

import { mergeWithDefaults } from './config-defaults'

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual !== expected) {
    throw new Error(`❌ ${msg}\n   Attendu : ${JSON.stringify(expected)}\n   Obtenu  : ${JSON.stringify(actual)}`)
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

  test('Config vide → défauts complets', () => {
    const { config, migrated } = mergeWithDefaults(null)
    assertEqual(migrated, false, 'Rien à migrer')
    assertEqual(config.enabled, false, 'Module désactivé par défaut')
    assertEqual(config.events.MEDIA_AVAILABLE.templateMovie, '', 'Template vide par défaut')
    assertEqual(config.events.EPISODE_AVAILABLE.enabled, false, 'EPISODE_AVAILABLE off par défaut')
  })

  test('Le legacy `template` alimente les DEUX variantes', () => {
    const { config, migrated } = mergeWithDefaults({
      events: { MEDIA_AVAILABLE: { enabled: true, template: '{title} dispo' } },
    })
    assertEqual(migrated, true, 'Migration signalée')
    assertEqual(config.events.MEDIA_AVAILABLE.templateMovie, '{title} dispo', 'Variante film')
    assertEqual(config.events.MEDIA_AVAILABLE.templateTv, '{title} dispo', 'Variante série')
  })

  test('Le legacy est SUPPRIMÉ après migration', () => {
    const { config } = mergeWithDefaults({
      events: { MEDIA_AVAILABLE: { enabled: true, template: '{title} dispo' } },
    })
    assertEqual('template' in config.events.MEDIA_AVAILABLE, false, 'Champ retiré')
  })

  test('Une variante déjà personnalisée n’est pas écrasée par le legacy', () => {
    const { config } = mergeWithDefaults({
      events: {
        MEDIA_AVAILABLE: { enabled: true, template: 'LEGACY', templateMovie: 'PERSO' },
      },
    })
    assertEqual(config.events.MEDIA_AVAILABLE.templateMovie, 'PERSO', 'Perso préservé')
    assertEqual(config.events.MEDIA_AVAILABLE.templateTv, 'LEGACY', 'Vide → legacy')
  })

  test('Vider un template est DURABLE après migration', () => {
    // Le scénario complet : legacy en base → chargement → l'admin vide le champ
    // → sauvegarde → rechargement. La valeur vidée doit tenir.
    const first = mergeWithDefaults({
      events: { MEDIA_AVAILABLE: { enabled: true, template: '{title} dispo' } },
    }).config

    // L'admin vide les deux champs dans l'interface, puis sauvegarde tel quel.
    first.events.MEDIA_AVAILABLE.templateMovie = ''
    first.events.MEDIA_AVAILABLE.templateTv = ''
    const saved = JSON.parse(JSON.stringify(first))

    const reloaded = mergeWithDefaults(saved)
    assertEqual(reloaded.migrated, false, 'Plus rien à migrer')
    assertEqual(reloaded.config.events.MEDIA_AVAILABLE.templateMovie, '', 'Reste vide')
    assertEqual(reloaded.config.events.MEDIA_AVAILABLE.templateTv, '', 'Reste vide')
  })

  test('Migration idempotente', () => {
    const once = mergeWithDefaults({
      events: { MEDIA_AVAILABLE: { enabled: true, template: 'X' } },
    })
    const twice = mergeWithDefaults(JSON.parse(JSON.stringify(once.config)))
    assertEqual(twice.migrated, false, 'Deuxième passage sans changement')
    assertEqual(twice.config.events.MEDIA_AVAILABLE.templateMovie, 'X', 'Valeur stable')
  })

  test('Les tableaux de défaut ne sont pas partagés entre configs', () => {
    const a = mergeWithDefaults(null).config
    const b = mergeWithDefaults(null).config
    a.events.MEDIA_AVAILABLE.targetUserIds.push(99)
    assertEqual(b.events.MEDIA_AVAILABLE.targetUserIds.length, 0, 'Config B intacte')
    assertEqual(mergeWithDefaults(null).config.events.MEDIA_AVAILABLE.targetUserIds.length, 0, 'Défaut intact')
  })

  test('Les sections manquantes reçoivent leurs défauts', () => {
    // La config en base d'origine n'a ni `webpush` ni `webhook`.
    const { config } = mergeWithDefaults({ enabled: true, evolution: { apiUrl: 'http://x' } })
    assertEqual(config.webpush.enabled, false, 'webpush par défaut')
    assertEqual(config.webhook.enabled, false, 'webhook par défaut')
    assertEqual(config.retry.maxAttempts, 3, 'retry par défaut')
    assertEqual(config.evolution.apiUrl, 'http://x', 'valeur existante préservée')
  })

  console.log(`\n${passed} réussis, ${failed} échoués`)
  if (failed > 0) process.exit(1)
}

runTests()
