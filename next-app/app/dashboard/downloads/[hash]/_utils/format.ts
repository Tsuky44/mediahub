/**
 * Format bytes to human readable string (sync version)
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Format speed to human readable string (sync version)
   */
  export function formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s'
    return formatBytes(bytesPerSecond) + '/s'
  }

  /**
   * Format seconds to time string (sync version)
   */
  export function formatDuration(seconds: number): string {
    if (seconds <= 0) return 'Terminé'
    if (seconds >= 8640000) return '∞'

    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) {
      return `${days}j ${hours}h`
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }
