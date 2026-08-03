/**
 * Utility to parse torrent names and detect media type
 * Extracts information like title, year, season, episode, quality, etc.
 */

export type MediaType = 'movie' | 'tv' | 'game' | 'unknown'

export interface ParsedTorrentName {
  mediaType: MediaType
  title: string
  year?: number
  season?: number
  episode?: number
  episodeRange?: { start: number; end: number }
  quality?: string
  source?: string  // BluRay, WEB-DL, WEBRip, HDTV, etc.
  codec?: string   // H.264, H.265, x264, x265, etc.
  audio?: string   // DTS, DD5.1, AAC, etc.
  releaseGroup?: string
  language?: string
  region?: string
  // Game-specific
  platform?: string  // PC, PS5, Xbox, Switch, etc.
  gameVersion?: string
  repack?: boolean
  // Raw info
  originalName: string
}

// Common patterns for detection
const PATTERNS = {
  // Episode patterns: S01E02, S01E02-E03, 1x02, etc.
  episode: [
    /[Ss](\d{1,2})[Ee](\d{1,3})(?:[-~][Ee]?(\d{1,3}))?/,  // S01E02 or S01E02-E03
    /[Ss](\d{1,2})\.?[Ee](\d{1,3})/,  // S01.E02
    /(\d{1,2})[xX](\d{1,3})(?:[-~](\d{1,3}))?/,  // 1x02 or 1x02-03
    /(?:Season|Saison)\s*(\d{1,2}).*?(?:Episode|Ep)\s*(\d{1,3})/i,
    /[Ee]p(?:isode)?\s*(\d{1,3})/i,
    /\b(\d{2,3})\b.*?(?:vostfr|sub|french|multi)/i,  // Episode number with language
  ],

  // Season patterns
  season: [
    /[Ss](\d{1,2})(?:\s*[Ee]\d+)?/,
    /(?:Season|Saison)\s*(\d{1,2})/i,
    /S\s*(\d{1,2})\s*(?:COMPLETE|FULL)/i,
  ],

  // Year pattern
  year: /\b(19[0-9]{2}|20[0-9]{2})\b/,

  // Quality patterns
  quality: [
    /\b(4K|UHD|2160p)\b/i,
    /\b(1080p|1080i|720p|480p|360p)\b/i,
    /\b(HDR|HDR10|HDR10+|DV|Dolby Vision)\b/i,
    /\b(REMUX)\b/i,
  ],

  // Source patterns
  source: [
    /\b(BluRay|BLURAY|BD|BD50|BD25)\b/i,
    /\b(WEB[-\s]?DL|WEBDL|WEB[-\s]?Rip|WEBRip)\b/i,
    /\b(HDTV|PDTV|HDTVRip)\b/i,
    /\b(DVD|DVD[-\s]?Rip|DVD9|DVD5)\b/i,
    /\b(CAM|HD[-\s]?CAM|TS|HD[-\s]?TS|TC)\b/i,
    /\b(VHS[-\s]?Rip)\b/i,
  ],

  // Codec patterns
  codec: [
    /\b(H\.265|HEVC|H265|x265)\b/i,
    /\b(H\.264|AVC|H264|x264)\b/i,
    /\b(AV1|VP9|MPEG[-\s]?2|MPEG[-\s]?4)\b/i,
    /\b(XviD|DivX)\b/i,
  ],

  // Audio patterns
  audio: [
    /\b(DD[\s+]?5\.1|DD[\s+]?2\.0|AC3|DTS[-\s]?HD|DTS[-\s]?X|DTS)\b/i,
    /\b(TrueHD|Atmos|Dolby Atmos)\b/i,
    /\b(AAC|FLAC|MP3|OGG|Opus)\b/i,
    /\b(5\.1|7\.1|2\.0)\s*(?:ch)?\b/i,
  ],

  // Release group (at the end, usually in brackets or after a dash)
  releaseGroup: /[-\[]\s*([A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*)\s*[\])]?$/,

  // Language patterns
  language: [
    /\b(VOSTFR|SUBFRENCH|SUB)\b/i,
    /\b(FRENCH|FRA|VF|VF2|VFF|VFQ)\b/i,
    /\b(ENGLISH|ENG|VO)\b/i,
    /\b(MULTI|MULTi)\b/i,
    /\b(TRUEFRENCH)\b/i,
  ],

  // Game-specific patterns
  game: {
    // Game platforms
    platforms: [
      /\b(PC|Windows)\b/i,
      /\b(PS5|PlayStation[\s-]?5)\b/i,
      /\b(PS4|PlayStation[\s-]?4)\b/i,
      /\b(PS3|PlayStation[\s-]?3)\b/i,
      /\b(Xbox Series[\s-]?X|S|XSX)\b/i,
      /\b(Xbox One)\b/i,
      /\b(Switch|Nintendo Switch)\b/i,
      /\b(Wii|Wii U|3DS|DS)\b/i,
      /\b(Mac|MacOS|OSX)\b/i,
      /\b(Linux|SteamOS)\b/i,
      /\b(Android|iOS|Mobile)\b/i,
    ],
    // Game-specific terms
    terms: [
      /\b(GOTY|Game of the Year|Edition|Definitive|Ultimate|Collector)\b/i,
      /\b(REPACK|PROPER|RELOADED|SKIDROW|CODEX|FLT|RUNE)\b/i,
      /\b(Crack|Cracked|Uncracked)\b/i,
      /\b(Update|Patch|DLC)\b/i,
      /\b(Build|Version|v\d+\.\d+)\b/i,
    ],
    // Common game file extensions/patterns
    extensions: /\.(iso|nsp|xci|pkg|exe|dmg|app|wad)\b/i,
  }
}

// Keywords that strongly indicate it's a game
const GAME_KEYWORDS = [
  'repack', 'proper', 'reloaded', 'skidrow', 'codex', 'flt', 'rune', 'dodi',
  'fitgirl', 'kaos', 'gog', 'steamunlocked', 'cs.rin', 'elamigos',
  'crack', 'cracked', 'uncracked', 'steamworks', 'online-fix',
  'update', 'patch', 'dlc', 'build', 'version', 'goty',
  'nsp', 'xci', 'pkg', 'wad', 'cia'
]

// Keywords that strongly indicate it's NOT a game
const NON_GAME_KEYWORDS = [
  's01e', 's02e', 'season', 'saison', 'episode', 'ep.',
  'hdtv', 'bluray', 'web-dl', 'webrip', 'brrip',
  'vostfr', 'french', 'truefrench', 'vf',
  '1080p', '720p', '2160p', '4k',
  'x264', 'x265', 'hevc', 'h264', 'h265',
  'dts', 'ac3', 'aac', '5.1', '7.1'
]

/**
 * Detect if the torrent is likely a game based on various indicators
 */
function isLikelyGame(name: string): boolean {
  const normalized = name.toLowerCase()
  
  let gameScore = 0
  let nonGameScore = 0

  // Check for game keywords
  for (const keyword of GAME_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase())) {
      gameScore += 2
    }
  }

  // Check for non-game (movie/TV) keywords
  for (const keyword of NON_GAME_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase())) {
      nonGameScore += 1
    }
  }

  // Check for episode patterns (strong TV indicator)
  for (const pattern of PATTERNS.episode) {
    if (pattern.test(normalized)) {
      nonGameScore += 3
      break
    }
  }

  // Check for platform indicators
  for (const pattern of PATTERNS.game.platforms) {
    if (pattern.test(normalized)) {
      gameScore += 2
    }
  }

  // Check for year pattern (common in movies)
  if (PATTERNS.year.test(normalized)) {
    // Games also have years, but less commonly in torrent names
    // Only add a small score
    nonGameScore += 0.5
  }

  return gameScore > nonGameScore
}

/**
 * Detect if the torrent is likely a TV show based on episode/season patterns
 */
function isLikelyTV(name: string): boolean {
  const normalized = name.toLowerCase()

  // Check for episode patterns
  for (const pattern of PATTERNS.episode) {
    if (pattern.test(normalized)) {
      return true
    }
  }

  // Check for season patterns (but no episodes - could be full season)
  for (const pattern of PATTERNS.season) {
    if (pattern.test(normalized)) {
      return true
    }
  }

  // S'il y a des termes comme "integrale", "saison", "season", "pack" ou "complete"
  if (/\b(saison|season|integrale|pack|complete)\b/i.test(normalized)) {
    return true
  }

  return false
}

/**
 * Detect if the torrent is likely a movie
 */
function isLikelyMovie(name: string): boolean {
  const normalized = name.toLowerCase()

  // Si c'est un jeu ou une série, ce n'est pas un film
  if (isLikelyTV(name) || isLikelyGame(name)) {
    return false
  }

  // S'il y a une année
  if (PATTERNS.year.test(normalized)) {
    return true
  }

  // S'il y a des extensions de fichiers vidéo courantes
  if (/\.(mkv|mp4|avi|divx|xvid|mov|wmv|mpg|mpeg|flv)$/i.test(normalized)) {
    return true
  }

  // S'il y a des mots-clés typiques de vidéo
  const videoKeywords = /\b(1080p|720p|2160p|4k|uhd|bluray|webrip|web-dl|hdtv|bdrip|brrip|dvdrip|multi|vff|vostfr|french|truefrench|vf|subfrench|vfq)\b/i
  if (videoKeywords.test(normalized)) {
    return true
  }

  return false
}

/**
 * Extract the year from the name
 */
function extractYear(name: string): number | undefined {
  const match = name.match(PATTERNS.year)
  if (match) {
    const year = parseInt(match[1], 10)
    // Sanity check: year between 1900 and next year
    const nextYear = new Date().getFullYear() + 1
    if (year >= 1900 && year <= nextYear) {
      return year
    }
  }
  return undefined
}

/**
 * Extract season number from name
 */
function extractSeason(name: string): number | undefined {
  const normalized = name.toLowerCase()
  
  for (const pattern of PATTERNS.season) {
    const match = normalized.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  return undefined
}

/**
 * Extract episode information from name
 */
function extractEpisode(name: string): { season?: number; episode?: number; episodeRange?: { start: number; end: number } } | undefined {
  const normalized = name.toLowerCase()
  
  for (const pattern of PATTERNS.episode) {
    const match = normalized.match(pattern)
    if (match) {
      const result: { season?: number; episode?: number; episodeRange?: { start: number; end: number } } = {}
      
      // Check if we have a season (groups vary by pattern)
      if (match[1] && !isNaN(parseInt(match[1], 10))) {
        const num1 = parseInt(match[1], 10)
        const num2 = match[2] ? parseInt(match[2], 10) : undefined
        const num3 = match[3] ? parseInt(match[3], 10) : undefined

        // Determine which is season and which is episode
        if (num1 <= 30 && num2 && num2 <= 50) {
          // SxxExx format
          result.season = num1
          result.episode = num2
          if (num3) {
            result.episodeRange = { start: num2, end: num3 }
          }
        } else if (num1 > 1900) {
          // Year, not season
          result.episode = num2
        } else {
          // Could be episode without season
          result.episode = num1
        }
      }
      
      return result
    }
  }
  return undefined
}

/**
 * Extract quality from name
 */
function extractQuality(name: string): string | undefined {
  const qualities: string[] = []
  
  for (const pattern of PATTERNS.quality) {
    const match = name.match(pattern)
    if (match) {
      qualities.push(match[1].toUpperCase())
    }
  }
  
  return qualities.length > 0 ? qualities.join(' ') : undefined
}

/**
 * Extract source from name
 */
function extractSource(name: string): string | undefined {
  for (const pattern of PATTERNS.source) {
    const match = name.match(pattern)
    if (match) {
      return match[1].toUpperCase().replace(/[-\s]/g, '')
    }
  }
  return undefined
}

/**
 * Extract codec from name
 */
function extractCodec(name: string): string | undefined {
  for (const pattern of PATTERNS.codec) {
    const match = name.match(pattern)
    if (match) {
      return match[1].toUpperCase()
    }
  }
  return undefined
}

/**
 * Extract audio info from name
 */
function extractAudio(name: string): string | undefined {
  const audio: string[] = []
  
  for (const pattern of PATTERNS.audio) {
    const match = name.match(pattern)
    if (match) {
      audio.push(match[1].toUpperCase())
    }
  }
  
  return audio.length > 0 ? audio.join(' ') : undefined
}

/**
 * Extract release group from name
 */
function extractReleaseGroup(name: string): string | undefined {
  const match = name.match(PATTERNS.releaseGroup)
  if (match) {
    return match[1]
  }
  
  // Try to find common release group patterns
  const commonGroups = /\b(YIFY|YTS|SPARKS|DRONES|GECKOS|ROVERS|SPRiNTER|HARDCODED|AMIABLE|ALLiANCE|BATV|BTN|CMRG|DIMENSION|ETRG|EVO|FGT|FLEET|FUM|GHOULS|ION10|JYK|KiNGS|KOGi|MAJESTiC|MEMENTO|METCON|NBY|NTb|NTG|OMiCRON|PHOENiX|PROPHET|RARBG|RELiANCE|ROBOTS|SEV|SH0W|SiGMA|SKIDROW|SPASM|SPDVD|STUTTERSHIT|SWAGGER|TASTETV|TBS|TJHD|TRiToN|UMRiX|UNiTY|W4F|W4NK3R|WAREZGamer|x0r|Xclusive|XII|xTriLL|YFN|YOGi|YW|Z0N3|ZiRT|ZMG)\b/i
  const groupMatch = name.match(commonGroups)
  if (groupMatch) {
    return groupMatch[1]
  }
  
  return undefined
}

/**
 * Extract language from name
 */
function extractLanguage(name: string): string | undefined {
  const normalized = name.toLowerCase()
  
  if (normalized.includes('vostfr')) return 'VOSTFR'
  if (normalized.includes('truefrench') || normalized.includes('vf2') || normalized.includes('vff')) return 'TrueFrench'
  if (normalized.includes('french') || normalized.includes('vf')) return 'French'
  if (normalized.includes('multi')) return 'Multi'
  if (normalized.includes('english') || normalized.includes('eng')) return 'English'
  
  return undefined
}

/**
 * Extract game platform from name
 */
function extractPlatform(name: string): string | undefined {
  const normalized = name.toLowerCase()
  
  if (normalized.includes('ps5') || normalized.includes('playstation 5')) return 'PS5'
  if (normalized.includes('ps4') || normalized.includes('playstation 4')) return 'PS4'
  if (normalized.includes('ps3') || normalized.includes('playstation 3')) return 'PS3'
  if (normalized.includes('xbox series') || normalized.includes('xsx')) return 'Xbox Series X|S'
  if (normalized.includes('xbox one')) return 'Xbox One'
  if (normalized.includes('switch') || normalized.includes('nintendo')) return 'Switch'
  if (normalized.includes('wii u')) return 'Wii U'
  if (normalized.includes('wii')) return 'Wii'
  if (normalized.includes('3ds')) return '3DS'
  if (normalized.includes('pc') || normalized.includes('windows')) return 'PC'
  if (normalized.includes('mac') || normalized.includes('osx')) return 'Mac'
  if (normalized.includes('linux')) return 'Linux'
  if (normalized.includes('android')) return 'Android'
  if (normalized.includes('ios')) return 'iOS'
  
  return undefined
}

/**
 * Extract the clean title from the torrent name
 */
function extractTitle(name: string, mediaType: MediaType): string {
  // Normaliser d'abord en remplaçant les séparateurs courants par des espaces pour simplifier les expressions régulières
  let title = name
    .replace(/\.torrent$/i, '')
    .replace(/[._\-]+/g, ' ')

  // For movies: stop at the year to get clean title
  if (mediaType === 'movie') {
    const yearMatch = title.match(/\b(19[0-9]{2}|20[0-9]{2})\b/)
    if (yearMatch) {
      // Keep only what's before the year
      const index = title.indexOf(yearMatch[0])
      title = title.substring(0, index)
    }
  }

  // For TV shows: stop at season/episode pattern
  if (mediaType === 'tv') {
    // Find the first occurrence of SxxExx or Sxx pattern and cut there
    const tvPatternMatch = title.match(/\b[Ss]\d{1,2}[Ee]\d{1,3}\b/)
    const seasonOnlyMatch = title.match(/\b[Ss]\d{1,2}\b/)
    if (tvPatternMatch) {
      const index = title.indexOf(tvPatternMatch[0])
      title = title.substring(0, index)
    } else if (seasonOnlyMatch) {
      const index = title.indexOf(seasonOnlyMatch[0])
      title = title.substring(0, index)
    } else {
      // Try 1x02 pattern
      const altPatternMatch = title.match(/\b\d{1,2}[xX]\d{1,3}\b/)
      if (altPatternMatch) {
        const index = title.indexOf(altPatternMatch[0])
        title = title.substring(0, index)
      }
    }
  }

  // Remove common suffixes/patterns
  title = title
    // Remove source (WEB, BluRay, etc.)
    .replace(/\b(BluRay|BLURAY|BD|BD50|BD25|WEB[-\s]?DL|WEBDL|WEB[-\s]?Rip|WEBRip|WEB|HDTV|PDTV|DVD|DVD[-\s]?Rip|CAM|HD[-\s]?CAM|TS|HD[-\s]?TS|TC)\b/gi, '')
    // Remove quality
    .replace(/\b(4K|UHD|2160p|1080p|1080i|720p|480p|360p|HDR|HDR10|HDR10\+|DV|REMUX|4KLight|1080pLight|720pLight|4K-Light|1080p-Light|720p-Light)\b/gi, '')
    // Remove technical specs
    .replace(/\b(10bit|10\-bit|8bit|8\-bit|12bit|12\-bit|HEVC|x265|x264|H\.265|H\.264|AVC|AV1|VP9|MPEG[-\s]?2|MPEG[-\s]?4|XviD|DivX)\b/gi, '')
    // Remove audio
    .replace(/\b(DD[\s+]?5\.1|DD[\s+]?2\.0|AC3|DTS[-\s]?HD|DTS[-\s]?X|DTS|TrueHD|Atmos|AAC|FLAC|MP3|5\.1|7\.1|2\.0)\b/gi, '')
    // Remove language
    .replace(/\b(VOSTFR|SUBFRENCH|SUB|FRENCH|FRA|VF|VF2|VFF|VFQ|VFI|ENGLISH|ENG|VO|VOST|MULTI|TRUEFRENCH)\b/gi, '')
    // Remove release features
    .replace(/\b(Hybrid|Unrated|Extended|Remastered|Director's[\s-]?Cut|Collector|Special[\s-]?Edition)\b/gi, '')
    // Remove release group (brackets at end or preceded by dash)
    .replace(/[-\[(]\s*[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*\s*[\])]?$/, '')
    // Remove year (for non-movies or if year is after title)
    .replace(/\b(19[0-9]{2}|20[0-9]{2})\b/, '')
    // Remove episode/season patterns (for remaining cases)
    .replace(/[Ss]\d{1,2}[Ee]\d{1,3}(?:[-~][Ee]?\d{1,3})?/gi, '')
    .replace(/[Ss]\d{1,2}\.?[Ee]\d{1,3}/gi, '')
    .replace(/\b[Ss]\d{1,2}\b/gi, '')
    .replace(/\d{1,2}[xX]\d{1,3}(?:[-~]\d{1,3})?/gi, '')
    .replace(/(?:Season|Saison)\s*\d{1,2}/gi, '')
    .replace(/[Ee]p(?:isode)?\s*\d{1,3}/gi, '')
    // Remove game-specific suffixes
    .replace(/\b(REPACK|PROPER|RELOADED|SKIDROW|CODEX|FLT|RUNE|CRACK|CRACKED|STEAMWORKS|GOG)\b/gi, '')
    .replace(/\b(GOTY|Game of the Year|Definitive|Ultimate|Collector|Edition)\b/gi, '')
    .replace(/\b(Update|Patch|DLC|Build|Version)\b.*$/i, '')
    // Remove extra spaces and punctuation
    .replace(/[\[\]()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return title
}

/**
 * Main function to parse a torrent name
 */
export function parseTorrentName(name: string): ParsedTorrentName {
  // Detect media type
  let mediaType: MediaType = 'unknown'
  
  if (isLikelyGame(name)) {
    mediaType = 'game'
  } else if (isLikelyTV(name)) {
    mediaType = 'tv'
  } else if (isLikelyMovie(name)) {
    mediaType = 'movie'
  }

  // Extract common info
  const year = extractYear(name)
  const episodeInfo = extractEpisode(name)
  const season = episodeInfo?.season || extractSeason(name)
  const quality = extractQuality(name)
  const source = extractSource(name)
  const codec = extractCodec(name)
  const audio = extractAudio(name)
  const releaseGroup = extractReleaseGroup(name)
  const language = extractLanguage(name)

  // Extract title based on media type
  const title = extractTitle(name, mediaType)

  // Build result
  const result: ParsedTorrentName = {
    mediaType,
    title,
    year,
    season,
    quality,
    source,
    codec,
    audio,
    releaseGroup,
    language,
    originalName: name
  }

  // Add episode-specific info for TV
  if (mediaType === 'tv' && episodeInfo) {
    result.episode = episodeInfo.episode
    result.episodeRange = episodeInfo.episodeRange
  }

  // Add game-specific info
  if (mediaType === 'game') {
    result.platform = extractPlatform(name)
    result.repack = /\b(repack|proper)\b/i.test(name)
  }

  return result
}

/**
 * Generate a search query for external APIs (TMDB)
 */
export function generateSearchQuery(parsed: ParsedTorrentName): string {
  // For movies/TV, return the title (TMDB handles year filtering well)
  return parsed.title
}

/**
 * Get a display name for the media type
 */
export function getMediaTypeDisplay(type: MediaType): string {
  switch (type) {
    case 'movie': return 'Film'
    case 'tv': return 'Série'
    case 'game': return 'Jeu vidéo'
    default: return 'Inconnu'
  }
}
