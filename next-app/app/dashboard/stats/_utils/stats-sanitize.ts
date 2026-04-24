/**
 * Sanitize la duree de lecture pour eviter les valeurs absurdes (ex: 346m pour un episode de 43m)
 * quand une session reste bloquee ou en pause trop longtemps.
 * Si `actualDurationInSeconds` est fourni, on l'utilise comme plafond + 5% de marge.
 */
export function sanitizePlaybackDuration(
    durationInSeconds: number,
    type: string,
    actualDurationInSeconds?: number
): number {
    if (!durationInSeconds) return 0

    if (actualDurationInSeconds && actualDurationInSeconds > 0) {
        const margin = actualDurationInSeconds * 0.05
        const absoluteMax = actualDurationInSeconds + margin
        if (durationInSeconds > absoluteMax) {
            return actualDurationInSeconds
        }
        return durationInSeconds
    }

    const minutes = durationInSeconds / 60

    let maxMinutes = 180 // Default 3h
    if (type === 'Episode' || type === 'Series') {
        maxMinutes = 80
    } else if (type === 'Movie') {
        maxMinutes = 240
    } else if (type === 'Audio') {
        maxMinutes = 15
    }

    if (minutes > maxMinutes) {
        return maxMinutes * 60
    }

    return durationInSeconds
}
