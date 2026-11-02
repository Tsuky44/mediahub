export function getStatusText(s: string): string {
  switch (s) {
    case 'Downloading':
      return 'Téléchargement en cours'
    case 'Importing':
      return 'Importation en cours'
    case 'Paused':
      return 'En pause'
    case 'Queued':
      return "En file d'attente"
    case 'Downloaded':
      return 'Disponible'
    case 'Partial':
      return 'Partiellement disponible'
    case 'Missing':
      return 'Manquant'
    default:
      return 'Téléchargement en cours'
  }
}

export function getStatusColor(s: string): string {
  switch (s) {
    case 'Downloading':
      return 'indigo'
    case 'Importing':
      return 'yellow'
    case 'Paused':
      return 'amber'
    case 'Queued':
      return 'slate'
    case 'Downloaded':
      return 'green'
    case 'Partial':
      return 'purple'
    case 'Missing':
      return 'red'
    default:
      return 'indigo'
  }
}

interface StatusConfig {
  color: string
  text: string
}

export function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'Downloaded':
      return { color: 'green', text: 'OK' }
    case 'Partial':
      return { color: 'purple', text: 'Partiel' }
    default:
      return { color: 'gray', text: status }
  }
}
