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
 * Vers la droite, c'est le miroir exact : la pilule quittee se retire vers la bulle choisie (son
 * bord droit reste en place), puis la bulle choisie se gonfle vers la gauche et ramene les bulles
 * d'avant a leur place. Sans cela, la bulle choisie glisserait sous la goutte des le depart.
 *
 * Tout est calcule a l'avance, image par image (interpolation lineaire) : largeurs et decalages
 * des bulles et de leurs corps, positions de la goutte qui suit la bulle d'arrivee pendant que la
 * rangee se reforme. Les deplacements de la goutte sont des transformations (compositeur).
 * `shift` : decalage de chaque bulle laisse par une animation interrompue, resorbe en douceur.
 */
export function liquidSwitch(
    parts: LiquidParts,
    from: number | null,
    to: number | null,
    start: number[],
    shift: number[],
    final: RowLayout,
) {
    const travelling = from !== null && to !== null && from !== to
    const T = travelling ? 0.9 : 0.7
    const times = Array.from({ length: FRAMES }, (_, i) => (i / (FRAMES - 1)) * T)
    // Pose exacte : le reste d'oscillation s'eteint sur le dernier cinquieme
    const land = (t: number) => 1 - smooth((t - 0.8 * T) / (0.2 * T))
    // La bulle choisie se gonfle quand la goutte l'atteint
    const inflateAt = travelling ? 0.36 * T : 0

    const grow = (t: number) => 1 - (1 - spring(t - inflateAt, 11, 0.5)) * land(t)
    const shrink = (t: number) => 1 - (1 - spring(t, 13, 0.62)) * land(t)
    const width = (i: number, t: number) => {
        const a = start[i]
        const b = final.w[i]
        if (Math.abs(a - b) < 0.5) return b
        return a + (b - a) * (b > a ? grow(t) : shrink(t))
    }
    const widths = times.map(t => final.w.map((_, i) => width(i, t)))
    // Vers la droite : la pilule quittee et les bulles qui la suivent sont decalees de ce qu'elle a
    // perdu (son bord droit tient), puis de moins en moins a mesure que la bulle choisie se gonfle.
    // Jamais en deca de leur place : le rebond du gonflement part a droite, sans heurter la bulle d'avant
    const rightward = travelling && to > from
    const offsets = times.map((t, f) =>
        final.w.map((_, i) => {
            const held = rightward && i >= from ? Math.max(0, start[from] - widths[f][from] - (start[from] - final.w[from]) * grow(t)) : 0
            return held + shift[i] * (1 - shrink(t))
        }),
    )
    // Position d'une bulle : sa place finale, decalee par les bulles d'avant qui n'ont pas fini de changer
    const left = (i: number, f: number) => {
        let x = final.x[i] + offsets[f][i]
        for (let j = 0; j < i; j++) x += widths[f][j] - final.w[j]
        return x
    }

    const timing: KeyframeAnimationOptions = { duration: T * 1000, easing: 'linear' }
    const animations: Animation[] = []
    final.w.forEach((_, i) => {
        const resized = Math.abs(start[i] - final.w[i]) >= 0.5
        const moved = offsets.some(o => Math.abs(o[i]) > 0.01)
        if (!resized && !moved) return
        // Largeur toujours tenue : interrompue, la bulle repart de sa largeur affichee (SeasonList)
        const frames = times.map((_, f) => ({
            width: `${widths[f][i]}px`,
            ...(moved && { translate: `${offsets[f][i]}px 0` }),
        }))
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
