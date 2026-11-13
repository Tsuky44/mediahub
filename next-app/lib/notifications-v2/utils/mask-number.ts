/**
 * Numéros de téléphone dans les logs : jamais en clair.
 * `tel:` dit que c'est un numéro, l'indicatif et les 2 derniers chiffres aident à le reconnaître.
 */

const digitsOf = (n: string) => n.replace(/[^\d]/g, '')

/** `33612345678` devient `tel:33*******78`. */
export function maskNumber(n: string | null | undefined): string {
  const d = digitsOf(n ?? '')
  if (!d) return 'tel:(vide)'
  if (d.length <= 4) return `tel:${'*'.repeat(d.length)}`
  return `tel:${d.slice(0, 2)}${'*'.repeat(d.length - 4)}${d.slice(-2)}`
}

/** Masque un numéro partout où il apparaît dans un texte (réponse d'erreur du fournisseur, par exemple). */
export function maskNumberIn(text: string, n: string): string {
  const d = digitsOf(n)
  return d.length < 6 ? text : text.split(d).join(maskNumber(d))
}
