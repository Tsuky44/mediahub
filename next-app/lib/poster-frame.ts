import sharp from 'sharp'

/**
 * Cadre clair imprimé dans certaines affiches TMDB (liseré blanc ou crème sur les bords) : chaque
 * bord est remplacé par la couleur de l'image juste à côté, sans rogner ni zoomer l'affiche.
 *
 * Un bord est un cadre quand ses lignes sont claires, unies et peu colorées, sur au moins 2 px, et
 * que l'image change franchement juste après (sinon c'est un fond clair, laissé tel quel).
 */

/** Luminance moyenne minimale d'une ligne de cadre (0-255) */
const LIGHT = 165
/** Écart type maximal de la luminance le long de la ligne : couleur unie */
const FLAT = 14
/** Écart moyen maximal entre canaux : blanc, crème ou gris clair, pas une couleur vive */
const GREY = 40
/** Épaisseur maximale cherchée, en part du côté */
const MAX_SHARE = 0.06

type Side = 'top' | 'bottom' | 'left' | 'right'

interface Pixels {
  data: Buffer
  width: number
  height: number
  channels: number
}

/** Statistiques d'une ligne (ou colonne) du bord, sans ses extrémités (coins, autres côtés) */
function lineStats({ data, width, height, channels }: Pixels, horizontal: boolean, index: number) {
  const length = horizontal ? width : height
  const skip = Math.floor(length * 0.04)
  let sum = 0
  let sum2 = 0
  let chroma = 0
  let n = 0
  for (let i = skip; i < length - skip; i++) {
    const o = ((horizontal ? index * width + i : i * width + index) * channels) | 0
    const r = data[o]
    const g = data[o + 1]
    const b = data[o + 2]
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    sum += l
    sum2 += l * l
    chroma += Math.max(r, g, b) - Math.min(r, g, b)
    n++
  }
  const mean = sum / n
  return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)), chroma: chroma / n }
}

/** Épaisseur du cadre d'un côté (0 si pas de cadre), ligne de transition comprise */
function frameThickness(px: Pixels, side: Side): number {
  const horizontal = side === 'top' || side === 'bottom'
  const length = horizontal ? px.height : px.width
  const max = Math.floor(length * MAX_SHARE)
  const at = (k: number) => (side === 'top' || side === 'left' ? k : length - 1 - k)
  let t = 0
  let frameMean = 0
  // Jusqu'à 2 lignes non claires tolérées tout au bord (liseré sombre autour du cadre)
  for (let k = 0; k < max; k++) {
    const s = lineStats(px, horizontal, at(k))
    if (s.mean >= LIGHT && s.std <= FLAT && s.chroma <= GREY) {
      t = k + 1
      frameMean = s.mean
    } else if (k - t >= 2) break
  }
  // Moins de 2 px, ou clair sur toute la profondeur cherchée : pas un cadre (fond clair)
  if (t < 2 || t >= max) return 0
  // L'image doit changer franchement juste après le cadre
  const inner = lineStats(px, horizontal, at(Math.min(t + 1, length - 1)))
  if (Math.abs(inner.mean - frameMean) < 25 && inner.std <= FLAT) return 0
  // + 1 ligne : mélange cadre/image laissé par la compression JPEG
  return t + 1
}

/** Remplit `count` lignes (ou colonnes) du bord avec la première ligne de l'image après le cadre */
function extend(px: Pixels, side: Side, count: number) {
  const { data, width, height, channels } = px
  if (side === 'left' || side === 'right') {
    const source = side === 'left' ? count : width - 1 - count
    for (let y = 0; y < height; y++) {
      const from = (y * width + source) * channels
      for (let k = 0; k < count; k++) {
        const x = side === 'left' ? k : width - 1 - k
        data.copyWithin((y * width + x) * channels, from, from + channels)
      }
    }
  } else {
    const source = side === 'top' ? count : height - 1 - count
    const rowBytes = width * channels
    for (let k = 0; k < count; k++) {
      const y = side === 'top' ? k : height - 1 - k
      data.copyWithin(y * rowBytes, source * rowBytes, (source + 1) * rowBytes)
    }
  }
}

/**
 * Affiche sans son cadre clair imprimé, ou null si elle n'en a pas (l'original est alors gardé tel
 * quel, sans recompression).
 */
export async function removePosterFrame(input: Buffer): Promise<Buffer | null> {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const px: Pixels = { data, width: info.width, height: info.height, channels: info.channels }
  if (px.width < 40 || px.height < 40) return null

  const sides: Side[] = ['left', 'right', 'top', 'bottom']
  const thickness = Object.fromEntries(sides.map((side) => [side, frameThickness(px, side)])) as Record<Side, number>
  if (sides.every((side) => thickness[side] === 0)) return null

  // Côtés d'abord, puis haut et bas (les coins reprennent les côtés déjà remplis)
  for (const side of sides) if (thickness[side]) extend(px, side, thickness[side])

  return sharp(px.data, { raw: { width: px.width, height: px.height, channels: px.channels as 3 } })
    .jpeg({ quality: 88 })
    .toBuffer()
}
