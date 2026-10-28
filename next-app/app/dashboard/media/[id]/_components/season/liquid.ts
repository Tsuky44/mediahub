import { smooth, spring } from '@/lib/spring'

/** Diametre d'une bulle de saison (px) */
export const BUBBLE = 48
/** Goutte qui voyage d'une bulle a l'autre et ses deux gouttelettes (px) */
const DROP = 40
const TAILS: [number, number][] = [[DROP * 0.5, 0.035], [DROP * 0.34, 0.07]]
const FRAMES = 72

export interface LiquidParts {
    /** Bulles, dans l'ordre */
    chips: HTMLElement[]
    /** Corps liquides des bulles (calque filtre), dans le meme ordre */
    bodies: HTMLElement[]
    drop: HTMLElement
    tails: HTMLElement[]
}

export interface RowLayout {
    /** Position (offsetLeft) et largeur finales de chaque bulle */
    x: number[]
    w: number[]
}

/**
 * Changement de saison en goutte, sur le modele de la bulle d'aide (SupportChatbot) : la bulle
 * quittee se retracte en rebondissant, une goutte s'en detache (prise d'elan, etirement selon la
 * vitesse, deux gouttelettes en traine), rejoint la bulle choisie, qui se gonfle alors en pilule
 * avec un leger tremblement. Le filtre #onyx-season-goo fusionne ces formes comme un liquide.
 *
 * Tout est calcule a l'avance, image par image (interpolation lineaire) : largeurs des bulles et
 * de leurs corps, positions de la goutte qui suit la bulle d'arrivee pendant que la rangee se
 * reforme. Les deplacements de la goutte sont des transformations (compositeur).
 */
export function liquidSwitch(parts: LiquidParts, from: number | null, to: number | null, start: number[], final: RowLayout) {
    const travelling = from !== null && to !== null && from !== to
    const T = travelling ? 0.9 : 0.7
    const times = Array.from({ length: FRAMES }, (_, i) => (i / (FRAMES - 1)) * T)
    // Pose exacte : le reste d'oscillation s'eteint sur le dernier cinquieme
    const land = (t: number) => 1 - smooth((t - 0.8 * T) / (0.2 * T))
    // La bulle choisie se gonfle quand la goutte l'atteint
    const inflateAt = travelling ? 0.36 * T : 0

    const width = (i: number, t: number) => {
        const a = start[i]
        const b = final.w[i]
        if (Math.abs(a - b) < 0.5) return b
        const p = b > a ? 1 - (1 - spring(t - inflateAt, 11, 0.5)) * land(t) : 1 - (1 - spring(t, 13, 0.62)) * land(t)
        return a + (b - a) * p
    }
    const widths = times.map(t => final.w.map((_, i) => width(i, t)))
    // Position d'une bulle : sa place finale, decalee par les bulles d'avant qui n'ont pas fini de changer
    const left = (i: number, f: number) => {
        let x = final.x[i]
        for (let j = 0; j < i; j++) x += widths[f][j] - final.w[j]
        return x
    }

    const timing: KeyframeAnimationOptions = { duration: T * 1000, easing: 'linear' }
    const animations: Animation[] = []
    final.w.forEach((_, i) => {
        if (Math.abs(start[i] - final.w[i]) < 0.5) return
        const frames = widths.map(w => ({ width: `${w[i]}px` }))
        animations.push(parts.chips[i].animate(frames, timing), parts.bodies[i].animate(frames, timing))
    })
    if (!travelling) return animations

    const dir = Math.sign(to - from)
    const origin = left(from, 0) + start[from] / 2
    const target = (f: number) => left(to, f) + BUBBLE / 2
    const travel = (t: number, lag: number) => 1 - (1 - spring(t - 0.05 - lag, 9, 0.74)) * land(t)
    // Prise d'elan : la goutte recule et se tasse avant de partir
    const windup = (t: number) => (t < 0.14 ? Math.sin((Math.PI * t) / 0.14) ** 2 : 0)
    const center = (f: number, lag = 0) => {
        const t = times[f]
        return origin + (target(f) - origin) * travel(t, lag) - (lag ? 0 : dir * 5 * windup(t))
    }
    const centers = times.map((_, f) => center(f))
    const speed = centers.map((_, f) => (centers[Math.min(f + 1, FRAMES - 1)] - centers[Math.max(f - 1, 0)]) / 2)
    const vmax = Math.max(...speed.map(Math.abs), 1e-6)

    const dropFrames = times.map((t, f) => {
        const v = Math.abs(speed[f]) / vmax
        const sx = 1 + (0.3 * v - 0.12 * windup(t)) * land(t)
        // Nait dans la bulle quittee, se fond dans la bulle choisie
        const k = (0.7 + 0.3 * smooth(t / 0.12)) * (1 - 0.25 * smooth((t - 0.7 * T) / (0.3 * T)))
        return {
            opacity: 1,
            transform: `translate(${centers[f] - DROP / 2}px, ${(BUBBLE - DROP) / 2}px) scale(${k * sx}, ${k / sx})`,
        }
    })
    animations.push(parts.drop.animate(dropFrames, timing))
    TAILS.forEach(([size, lag], j) => {
        const el = parts.tails[j]
        if (!el) return
        const frames = times.map((t, f) => ({
            opacity: 1,
            transform: `translate(${center(f, lag) - size / 2}px, ${(BUBBLE - size) / 2}px) scale(${0.6 + 0.4 * smooth(t / 0.15)})`,
        }))
        animations.push(el.animate(frames, timing))
    })
    return animations
}

/** Tailles des gouttelettes de traine, pour le rendu */
export const TAIL_SIZES = TAILS.map(([size]) => size)
export const DROP_SIZE = DROP
