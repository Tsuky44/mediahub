export type TmdbImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

export function getPosterUrl(posterPath: string | null, size: TmdbImageSize = 'w500'): string {
  if (!posterPath) return '/placeholder.png'
  if (posterPath.startsWith('http') || posterPath.startsWith('/api')) {
    return posterPath
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath.startsWith('/') ? '' : '/'}${posterPath}`
}
