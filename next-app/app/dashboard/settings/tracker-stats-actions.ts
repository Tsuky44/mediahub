'use server'

import { revalidatePath } from 'next/cache'
import { getTrackerConfigs, saveTrackerConfigs, fetchAllTrackerStats, TrackerConfig, TrackerStats, formatTrackerBytes, getRatioColor, invalidateTrackerStatsCache } from '@/lib/services/tracker-stats-service'
import { checkAccess } from '../downloads/actions'
import { randomUUID } from 'crypto'

async function hasTrackerAccess(): Promise<boolean> {
  try {
    await checkAccess('view')
    return true
  } catch {
    return false
  }
}

/**
 * Get all tracker configurations
 */
export async function getConfiguredTrackers(): Promise<{ configs: TrackerConfig[] }> {
  if (!await hasTrackerAccess()) {
    return { configs: [] }
  }

  try {
    const configs = await getTrackerConfigs()
    // Remove sensitive data before sending to client
    const sanitizedConfigs = configs.map(c => ({
      ...c,
      apiKey: c.apiKey ? '***hidden***' : undefined,
      password: c.password ? '***hidden***' : undefined,
      passkey: c.passkey ? '***hidden***' : undefined
    }))
    return { configs: sanitizedConfigs }
  } catch (e: any) {
    console.error('[TrackerStats] Failed to get trackers:', e)
    return { configs: [] }
  }
}

/**
 * Add a new tracker configuration
 */
export async function addTrackerConfig(
  config: Omit<TrackerConfig, 'id' | 'lastSync'>
): Promise<{ success: boolean; error?: string; config?: TrackerConfig }> {
  if (!await hasTrackerAccess()) {
    return { success: false, error: 'Permission denied' }
  }

  try {
    const configs = await getTrackerConfigs()
    
    // Check for duplicate name
    if (configs.some(c => c.name.toLowerCase() === config.name.toLowerCase())) {
      return { success: false, error: 'Un tracker avec ce nom existe déjà' }
    }

    const newConfig: TrackerConfig = {
      ...config,
      id: randomUUID(),
      lastSync: undefined
    }

    configs.push(newConfig)
    await saveTrackerConfigs(configs)
    invalidateTrackerStatsCache()

    revalidatePath('/dashboard/settings')
    
    // Return sanitized version
    return { 
      success: true, 
      config: {
        ...newConfig,
        apiKey: newConfig.apiKey ? '***hidden***' : undefined,
        password: newConfig.password ? '***hidden***' : undefined,
        passkey: newConfig.passkey ? '***hidden***' : undefined
      }
    }
  } catch (e: any) {
    console.error('[TrackerStats] Failed to add tracker:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Update a tracker configuration
 */
export async function updateTrackerConfig(
  id: string,
  updates: Partial<TrackerConfig>
): Promise<{ success: boolean; error?: string }> {
  if (!await hasTrackerAccess()) {
    return { success: false, error: 'Permission denied' }
  }

  try {
    const configs = await getTrackerConfigs()
    const index = configs.findIndex(c => c.id === id)
    
    if (index === -1) {
      return { success: false, error: 'Tracker non trouvé' }
    }

    // Update fields, preserving sensitive data if not provided
    configs[index] = {
      ...configs[index],
      ...updates,
      // Keep existing sensitive values if not explicitly updated
      apiKey: updates.apiKey || configs[index].apiKey,
      password: updates.password || configs[index].password,
      passkey: updates.passkey || configs[index].passkey
    }

    await saveTrackerConfigs(configs)
    invalidateTrackerStatsCache()
    revalidatePath('/dashboard/settings')
    
    return { success: true }
  } catch (e: any) {
    console.error('[TrackerStats] Failed to update tracker:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Delete a tracker configuration
 */
export async function deleteTrackerConfig(id: string): Promise<{ success: boolean; error?: string }> {
  if (!await hasTrackerAccess()) {
    return { success: false, error: 'Permission denied' }
  }

  try {
    const configs = await getTrackerConfigs()
    const filtered = configs.filter(c => c.id !== id)
    
    if (filtered.length === configs.length) {
      return { success: false, error: 'Tracker non trouvé' }
    }

    await saveTrackerConfigs(filtered)
    invalidateTrackerStatsCache()
    revalidatePath('/dashboard/settings')
    
    return { success: true }
  } catch (e: any) {
    console.error('[TrackerStats] Failed to delete tracker:', e)
    return { success: false, error: e.message }
  }
}

/**
 * Test tracker connection
 */
export async function testTrackerConnection(
  config: TrackerConfig
): Promise<{ success: boolean; error?: string; stats?: TrackerStats }> {
  if (!await hasTrackerAccess()) {
    return { success: false, error: 'Permission denied' }
  }

  try {
    // If this is an existing tracker (has id), merge with stored credentials
    // because the UI sends ***hidden*** or undefined for sensitive fields
    if (config.id) {
      const existingConfigs = await getTrackerConfigs()
      const existing = existingConfigs.find(c => c.id === config.id)
      if (existing) {
        config = {
          ...config,
          apiKey: (!config.apiKey || config.apiKey === '***hidden***') ? existing.apiKey : config.apiKey,
          password: (!config.password || config.password === '***hidden***') ? existing.password : config.password,
          passkey: (!config.passkey || config.passkey === '***hidden***') ? existing.passkey : config.passkey,
        }
      }
    }
    
    // Specific checks based on tracker type
    if (config.type === 'scraper') {
      const nameLower = (config.name || '').toLowerCase()
      // These trackers use API token (apiKey/passkey) - no login needed
      const useApiToken = nameLower.includes('gemini') || 
                          nameLower.includes('tos') || nameLower.includes('theoldschool') || 
                          nameLower.includes('old school') || nameLower.includes('oldschool')
      
      if (useApiToken) {
        if (!config.apiKey && !config.passkey) {
          return { 
            success: false, 
            error: 'Pour ce tracker, un token API est obligatoire (champ API Key ou Passkey).' 
          }
        }
      } else if (!config.username || !config.password) {
        return { 
          success: false, 
          error: 'Pour les trackers avec scraping, le nom d\'utilisateur et le mot de passe sont obligatoires.' 
        }
      }
    }
    
    if (config.type === 'gazelle' || config.type === 'unit3d') {
      if (!config.apiKey && !config.passkey) {
        return { 
          success: false, 
          error: 'Pour les trackers Gazelle/Unit3d, la clé API (Passkey) est obligatoire.' 
        }
      }
    }

    const { fetchTrackerStats } = await import('@/lib/services/tracker-stats-service')
    const stats = await fetchTrackerStats({ ...config, enabled: true })
    
    if (stats) {
      return { success: true, stats }
    } else {
      let errorMsg = 'Impossible de récupérer les statistiques.'
      if (config.type === 'scraper') {
        errorMsg += ' Vérifiez que votre login et mot de passe sont corrects. Le site peut avoir changé sa structure.'
      } else {
        errorMsg += ' Vérifiez votre clé API et l\'URL.'
      }
      return { success: false, error: errorMsg }
    }
  } catch (e: any) {
    console.error('[TrackerStats] Connection test failed:', e)
    return { success: false, error: `Erreur: ${e.message}` }
  }
}

/**
 * Get all tracker stats (uses 2h cache by default, use force=true to bypass)
 */
export async function getAllTrackerStats(force: boolean = false): Promise<{ 
  stats: Map<string, TrackerStats>; 
  configs: TrackerConfig[];
  formatted: Array<{
    id: string;
    name: string;
    baseUrl?: string;
    uploaded: string;
    downloaded: string;
    uploadedBytes: number;
    downloadedBytes: number;
    ratio: number;
    ratioColor: string;
    bonusPoints?: number;
    seedingCount?: number;
    leechingCount?: number;
    lastUpdated: string;
    enabled: boolean;
  }>;
  cache: { cached: boolean; age?: number; expiresIn?: number };
}> {
  if (!await hasTrackerAccess()) {
    return { stats: new Map(), configs: [], formatted: [], cache: { cached: false } }
  }

  try {
    const { fetchAllTrackerStats, getTrackerConfigs, formatTrackerBytes, getRatioColor, getTrackerStatsCacheInfo } = await import('@/lib/services/tracker-stats-service')
    
    const [stats, configs] = await Promise.all([
      fetchAllTrackerStats(force),
      getTrackerConfigs()
    ])

    const formatted = configs.map(config => {
      const stat = stats.get(config.id)
      return {
        id: config.id,
        name: config.name,
        baseUrl: config.baseUrl,
        uploaded: stat ? formatTrackerBytes(stat.uploaded) : '-',
        downloaded: stat ? formatTrackerBytes(stat.downloaded) : '-',
        uploadedBytes: stat?.uploaded || 0,
        downloadedBytes: stat?.downloaded || 0,
        ratio: stat ? stat.ratio : 0,
        ratioColor: stat ? getRatioColor(stat.ratio) : 'text-gray-400',
        bonusPoints: stat?.bonusPoints,
        seedingCount: stat?.seedingCount,
        leechingCount: stat?.leechingCount,
        lastUpdated: stat ? new Date(stat.lastUpdated).toLocaleString('fr-FR') : '-',
        enabled: config.enabled
      }
    })

    return { stats, configs, formatted, cache: getTrackerStatsCacheInfo() }
  } catch (e: any) {
    console.error('[TrackerStats] Failed to get stats:', e)
    return { stats: new Map(), configs: [], formatted: [], cache: { cached: false } }
  }
}

export { formatTrackerBytes, getRatioColor }

/**
 * Import trackers from Prowlarr configuration
 * This extracts tracker configs from Prowlarr and adds them to our system
 */
export async function importTrackersFromProwlarr(): Promise<{ 
  success: boolean; 
  error?: string; 
  imported: number;
  configs: Array<{ name: string; baseUrl?: string; apiKey?: boolean }>
}> {
  if (!await hasTrackerAccess()) {
    return { success: false, error: 'Permission denied', imported: 0, configs: [] }
  }

  try {
    const { getProwlarrService } = await import('@/lib/services/prowlarr')
    const prowlarr = await getProwlarrService()
    
    if (!prowlarr) {
      return { success: false, error: 'Prowlarr n\'est pas configuré', imported: 0, configs: [] }
    }

    const indexers = await prowlarr.getIndexers()
    const existingConfigs = await getTrackerConfigs()
    const importedConfigs: Array<{ name: string; baseUrl?: string; apiKey?: boolean }> = []
    let count = 0

    for (const indexer of indexers) {
      // Skip if already exists
      if (existingConfigs.some(c => c.name.toLowerCase() === indexer.name.toLowerCase())) {
        continue
      }

      // Get detailed config
      const config = await prowlarr.getTrackerConfigFromIndexer(indexer.id)
      
      if (config) {
        // Determine type from implementation name
        let type: TrackerConfig['type'] = 'custom'
        const impl = indexer.implementation?.toLowerCase() || ''
        const nameLower = indexer.name.toLowerCase()
        
        // French trackers that need scraping
        const frenchTrackers = ['c411', 'c441', 'lacale', 'theoldschool', 'tor9', 'abnormal']
        const isFrenchTracker = frenchTrackers.some(ft => nameLower.includes(ft))
        
        if (impl.includes('gazelle')) type = 'gazelle'
        else if (impl.includes('unit3d')) type = 'unit3d'
        else if (impl.includes('jackett')) type = 'jackett'
        else if (isFrenchTracker) type = 'scraper'

        const newConfig: TrackerConfig = {
          id: randomUUID(),
          name: indexer.name,
          type,
          baseUrl: config.baseUrl || indexer.infoLink || '',
          apiKey: config.apiKey || config.passkey || '',
          username: config.username,
          password: config.password,
          passkey: config.passkey,
          enabled: indexer.enable !== false
        }

        existingConfigs.push(newConfig)
        count++
        
        importedConfigs.push({
          name: indexer.name,
          baseUrl: newConfig.baseUrl,
          apiKey: !!(config.apiKey || config.passkey)
        })
      }
    }

    if (count > 0) {
      await saveTrackerConfigs(existingConfigs)
      revalidatePath('/dashboard/settings')
    }

    return { 
      success: true, 
      imported: count,
      configs: importedConfigs
    }
  } catch (e: any) {
    console.error('[TrackerStats] Failed to import from Prowlarr:', e)
    return { success: false, error: e.message, imported: 0, configs: [] }
  }
}

/**
 * Debug: Get raw Prowlarr data to see what stats are available
 */
export async function debugProwlarrData(): Promise<{
  success: boolean
  error?: string
  indexerStats?: any
  sampleIndexer?: any
  allIndexerFields?: any[]
}> {
  if (!await hasTrackerAccess()) {
    return { success: false, error: 'Permission denied' }
  }

  try {
    const { getProwlarrService } = await import('@/lib/services/prowlarr')
    const prowlarr = await getProwlarrService()
    
    if (!prowlarr) {
      return { success: false, error: 'Prowlarr n\'est pas configuré' }
    }

    // Get indexer stats (search/grab stats)
    const indexerStats = await prowlarr.getIndexerStats()
    
    // Get all indexers
    const indexers = await prowlarr.getIndexers()
    
    // Get detailed config for first indexer to see fields
    const allIndexerFields: any[] = []
    for (const indexer of indexers.slice(0, 5)) {
      const details = await prowlarr.getIndexerDetails(indexer.id)
      if (details) {
        allIndexerFields.push({
          name: details.name,
          implementation: details.implementation,
          fields: (details.fields || []).map((f: any) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            hasValue: !!f.value,
            valuePreview: typeof f.value === 'string' ? f.value.substring(0, 50) : f.value
          }))
        })
      }
    }

    return {
      success: true,
      indexerStats,
      sampleIndexer: indexers[0],
      allIndexerFields
    }
  } catch (e: any) {
    console.error('[TrackerStats] Debug failed:', e)
    return { success: false, error: e.message }
  }
}
