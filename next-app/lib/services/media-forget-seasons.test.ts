/**
 * Tests de pruneSeasonFromRequest : npx tsx lib/services/media-forget-seasons.test.ts
 */
import assert from 'node:assert/strict'
import { pruneSeasonFromRequest } from './media-forget-seasons'

const cases: Array<[string, string | null, number, { keep: boolean; metadata: string | null }]> = [
  ['la seule saison demandee part avec la demande', '{"seasons":[2]}', 2, { keep: false, metadata: '{"seasons":[2]}' }],
  ['les autres saisons restent', '{"seasons":[1,2,3],"x":1}', 2, { keep: true, metadata: '{"seasons":[1,3],"x":1}' }],
  ['une saison au format objet', '{"seasons":[{"seasonNumber":1},{"seasonNumber":2}]}', 1, { keep: true, metadata: '{"seasons":[{"seasonNumber":2}]}' }],
  ['une autre saison ne change rien', '{"seasons":[1]}', 4, { keep: true, metadata: '{"seasons":[1]}' }],
  ['sans saisons listees, la demande vise toute la serie et reste', '{}', 1, { keep: true, metadata: '{}' }],
  ['sans metadonnees', null, 1, { keep: true, metadata: null }],
  ['metadonnees illisibles', 'pas du json', 1, { keep: true, metadata: 'pas du json' }],
]

for (const [name, metadata, season, expected] of cases) {
  assert.deepEqual(pruneSeasonFromRequest(metadata, season), expected, name)
  console.log(`ok - ${name}`)
}
