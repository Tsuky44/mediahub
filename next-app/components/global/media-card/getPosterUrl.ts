export function getPosterUrl(posterPath: string | null): string {
  if (!posterPath) return '/placeholder.png'
  if (posterPath.startsWith('http') || posterPath.startsWith('/api')) {
    return posterPath
  }
  return `https://image.tmdb.org/t/p/w500${posterPath.startsWith('/') ? '' : '/'}${posterPath}`
}
