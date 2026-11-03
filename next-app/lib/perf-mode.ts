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

/**
 * Verdict « machine correcte », daté de la version de la détection : une détection améliorée
 * réévalue les machines jugées correctes par la précédente (« full », avant la lecture du nom de la
 * puce graphique sous Firefox). Le mode allégé, lui, reste acquis.
 */
const FULL = 'full-2'

function remember(mode: 'lite' | 'full') {
  try {
    localStorage.setItem(KEY, mode === 'full' ? FULL : mode)
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
  // Nom de la puce : extension dédiée (Chrome), sinon RENDERER, que les navigateurs au moteur de
  // Firefox renseignent directement (l'extension y est dépréciée, ou masquée par la protection
  // contre le pistage : sans ce secours, une petite puce Intel n'y était jamais reconnue)
  const info = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = String((info && gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '')
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
  if (known === 'lite' || known === FULL) return
  const run = () => {
    if (weakGraphics()) enableLite()
    else remember('full')
  }
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}

let rough = 0

/** Une animation (ou un défilement) dont le quart des images les plus lentes dépasse 30 ms est saccadée */
function judge(gaps: number[], min: number) {
  if (gaps.length < min) return
  gaps.sort((a, b) => a - b)
  if (gaps[Math.floor(gaps.length * 0.75)] > 30 && ++rough >= 2) enableLite()
}

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
    else judge(gaps, 6)
  }
  requestAnimationFrame(tick)
}

/**
 * Défilement (motion.css) :
 * - pendant qu'on défile, une couche transparente (onyx-scroll-shield) prend la souris : sinon
 *   chaque affiche qui passe sous la souris immobile lance ses effets (agrandissement, ombre,
 *   voile). Une couche à montrer ou cacher, plutôt qu'un style sur toute la page à recalculer ;
 * - sorti du haut de page (data-onyx-scrolled), le lent zoom de l'image de fond s'arrête : il
 *   obligerait à redessiner toute l'image, et les flous posés dessus, à chaque image ;
 * - un défilement saccadé compte comme une animation saccadée.
 */
export function watchScroll() {
  const root = document.documentElement
  let scrolled = false
  let gaps: number[] = []
  let last = 0
  let raf = 0
  let idle = 0
  let rest = 0
  // Écrans à souris seulement (au doigt, pas de survol)
  const shield = matchMedia('(hover: hover)').matches ? document.createElement('div') : null
  if (shield) {
    shield.className = 'onyx-scroll-shield'
    shield.setAttribute('aria-hidden', 'true')
    document.body.appendChild(shield)
  }
  let shielded = false
  const tick = (now: number) => {
    if (last) gaps.push(now - last)
    last = now
    raf = requestAnimationFrame(tick)
  }
  // Fin du défilement (plus d'événement depuis 250 ms) : verdict sur les images mesurées
  const settle = () => {
    cancelAnimationFrame(raf)
    raf = 0
    last = 0
    judge(gaps, 12)
    gaps = []
  }
  const stop = () => {
    shielded = false
    if (shield) shield.style.display = ''
  }
  const onScroll = () => {
    const away = window.scrollY > 24
    if (away !== scrolled) {
      scrolled = away
      root.toggleAttribute('data-onyx-scrolled', away)
    }
    // Souris rendue 200 ms après le dernier mouvement
    if (shield && !shielded) {
      shielded = true
      shield.style.display = 'block'
    }
    window.clearTimeout(rest)
    rest = window.setTimeout(stop, 200)
    if (isLite() || navigator.webdriver) return
    if (!raf) raf = requestAnimationFrame(tick)
    window.clearTimeout(idle)
    idle = window.setTimeout(settle, 250)
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  return () => {
    window.removeEventListener('scroll', onScroll)
    cancelAnimationFrame(raf)
    window.clearTimeout(idle)
    window.clearTimeout(rest)
    shield?.remove()
  }
}
