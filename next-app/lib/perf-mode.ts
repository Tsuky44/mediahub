/**
 * Mode allégé des animations, pour les machines sans vraie carte graphique (Pentium, Celeron,
 * rendu logiciel) : mêmes mouvements, sans les flous qui se recalculent à chaque image
 * (motion.css, :root[data-onyx-lite]).
 *
 * Choix retenu dans localStorage « onyx-perf » : « lite » ou « full ». Le script de tête de page
 * (app/layout.tsx) l'applique avant le premier affichage ; sans choix retenu, la machine est
 * évaluée une fois, au repos, puis le résultat est gardé.
 */

const KEY = 'onyx-perf'
const ATTR = 'data-onyx-lite'

/** Script de tête de page : applique le mode retenu avant le premier affichage */
export const PERF_MODE_SCRIPT = `try{if(localStorage.getItem('${KEY}')==='lite')document.documentElement.setAttribute('${ATTR}','')}catch(e){}`

export const isLite = () => document.documentElement.hasAttribute(ATTR)

function remember(mode: 'lite' | 'full') {
  try {
    localStorage.setItem(KEY, mode)
  } catch {}
}

export function enableLite() {
  document.documentElement.setAttribute(ATTR, '')
  remember('lite')
}

/** Rendu sans vraie accélération graphique, ou petite puce Intel sur un processeur modeste */
function weakGraphics(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (memory !== undefined && memory <= 2) return true
  const canvas = document.createElement('canvas')
  // Le navigateur refuse ce contexte quand il n'aurait qu'un rendu logiciel ou très dégradé
  const gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) as WebGLRenderingContext | null
  if (!gl) return true
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
  gl.getExtension('WEBGL_lose_context')?.loseContext()
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) return true
  const cores = navigator.hardwareConcurrency || 4
  return cores <= 4 && /intel/i.test(renderer) && /(hd|uhd) graphics/i.test(renderer) && !/iris/i.test(renderer)
}

/** Première visite : évalue la machine au repos et retient le résultat */
export function detectPerfMode() {
  let known: string | null = null
  try {
    known = localStorage.getItem(KEY)
  } catch {}
  if (known) return
  const run = () => {
    if (weakGraphics()) enableLite()
    else remember('full')
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}

let rough = 0

/**
 * Filet de sécurité : pendant une grande animation, compte les images trop lentes. Deux animations
 * saccadées et le mode allégé s'active (et reste) : les suivantes seront fluides.
 */
export function watchFrames(duration: number) {
  // Navigateurs pilotés (tests automatiques) : le mode choisi pour le test ne change pas en route
  if (isLite() || navigator.webdriver) return
  const gaps: number[] = []
  let last = 0
  const start = performance.now()
  const tick = (now: number) => {
    if (last) gaps.push(now - last)
    last = now
    if (now - start < duration) requestAnimationFrame(tick)
    else if (gaps.length >= 6) {
      gaps.sort((a, b) => a - b)
      if (gaps[Math.floor(gaps.length * 0.75)] > 30 && ++rough >= 2) enableLite()
    }
  }
  requestAnimationFrame(tick)
}
