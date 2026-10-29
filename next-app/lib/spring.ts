/** Courbes du mouvement liquide (goutte de la bulle d'aide, bulles des saisons) */

/** Lissage de 0 a 1 (smoothstep), borne */
export const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))

/**
 * Ressort amorti : de 0 a 1, vitesse nulle au depart, leger depassement puis repos.
 * `t` en secondes, `w` pulsation (raideur), `z` amortissement (< 1 : rebond).
 */
export function spring(t: number, w = 10, z = 0.7) {
  if (t <= 0) return 0
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}
