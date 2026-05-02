// Genre mapping between Movie and TV genres (TMDB IDs)
// Some genres are shared, others need to be mapped to equivalents

export const MOVIE_TO_TV_GENRE_MAP: Record<number, number> = {
  // Action (28) → Action & Adventure (10759)
  28: 10759,
  // Adventure (12) → Action & Adventure (10759)
  12: 10759,
  // Animation (16) → Animation (16) - same
  16: 16,
  // Comedy (35) → Comedy (35) - same
  35: 35,
  // Crime (80) → Crime (80) - same
  80: 80,
  // Documentary (99) → Documentary (99) - same
  99: 99,
  // Drama (18) → Drama (18) - same
  18: 18,
  // Family (10751) → Family (10751) - same
  10751: 10751,
  // Fantasy (14) → Sci-Fi & Fantasy (10765)
  14: 10765,
  // History (36) → No direct equivalent, map to War & Politics (10768)
  36: 10768,
  // Horror (27) → No direct equivalent
  27: 0,
  // Music (10402) → No direct equivalent
  10402: 0,
  // Mystery (9648) → Mystery (9648) - same
  9648: 9648,
  // Romance (10749) → No direct equivalent
  10749: 0,
  // Science Fiction (878) → Sci-Fi & Fantasy (10765)
  878: 10765,
  // TV Movie (10770) → No direct equivalent
  10770: 0,
  // Thriller (53) → No direct equivalent
  53: 0,
  // War (10752) → War & Politics (10768)
  10752: 10768,
  // Western (37) → Western (37) - same
  37: 37,
}

export const TV_TO_MOVIE_GENRE_MAP: Record<number, number> = {
  // Action & Adventure (10759) → Action (28)
  10759: 28,
  // Animation (16) → Animation (16) - same
  16: 16,
  // Comedy (35) → Comedy (35) - same
  35: 35,
  // Crime (80) → Crime (80) - same
  80: 80,
  // Documentary (99) → Documentary (99) - same
  99: 99,
  // Drama (18) → Drama (18) - same
  18: 18,
  // Family (10751) → Family (10751) - same
  10751: 10751,
  // Kids (10762) → Family (10751)
  10762: 10751,
  // Mystery (9648) → Mystery (9648) - same
  9648: 9648,
  // News (10763) → No direct equivalent
  10763: 0,
  // Reality (10764) → No direct equivalent
  10764: 0,
  // Sci-Fi & Fantasy (10765) → Science Fiction (878)
  10765: 878,
  // Soap (10766) → Drama (18)
  10766: 18,
  // Talk (10767) → No direct equivalent
  10767: 0,
  // War & Politics (10768) → War (10752)
  10768: 10752,
  // Western (37) → Western (37) - same
  37: 37,
}

/**
 * Map genres from one type to another
 * @param genres Array of genre IDs
 * @param fromType Source type ('movie' or 'tv')
 * @param toType Target type ('movie' or 'tv')
 * @returns Array of mapped genre IDs (filtered to remove unmapped/0 values)
 */
export function mapGenres(genres: number[], fromType: 'movie' | 'tv' | 'all', toType: 'movie' | 'tv' | 'all'): number[] {
  if (fromType === toType || fromType === 'all' || toType === 'all') {
    return genres
  }
  
  const mapping = fromType === 'movie' ? MOVIE_TO_TV_GENRE_MAP : TV_TO_MOVIE_GENRE_MAP
  
  return genres
    .map(id => mapping[id] || 0)
    .filter(id => id !== 0)
}
