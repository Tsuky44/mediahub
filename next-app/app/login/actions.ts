'use server'

import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

const PLEX_API_URL = 'https://plex.tv/api/v2'
const PLEX_PRODUCT = 'MediaHub'

// Generate a consistent client identifier for the server if needed, 
// but for the PIN flow, the client identifier should ideally be consistent 
// for the session. We'll let the client pass it or generate a new one.
// Actually, for PIN flow, we generate a code linked to a client identifier.

export async function getPlexAuthPin(clientIdentifier?: string) {
  const clientId = clientIdentifier || uuidv4()
  
  try {
    const response = await axios.post(
      `${PLEX_API_URL}/pins`,
      new URLSearchParams({
        strong: 'true',
        'X-Plex-Product': PLEX_PRODUCT,
        'X-Plex-Client-Identifier': clientId,
      }),
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    return {
      id: response.data.id,
      code: response.data.code,
      clientIdentifier: clientId,
      product: PLEX_PRODUCT,
      // The URL to redirect the user to
      authUrl: `https://app.plex.tv/auth#?clientID=${clientId}&code=${response.data.code}&context[device][product]=${PLEX_PRODUCT}`
    }
  } catch (error: any) {
    console.error('[PlexAuth] Error getting PIN:', error.message)
    throw new Error('Impossible de démarrer l\'authentification Plex')
  }
}

export async function checkPlexAuthPin(pinId: string, clientIdentifier: string) {
  try {
    const response = await axios.get(
      `${PLEX_API_URL}/pins/${pinId}`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Plex-Client-Identifier': clientIdentifier
        }
      }
    )

    const data = response.data
    
    // data.authToken is present if authorized
    return {
      authorized: !!data.authToken,
      authToken: data.authToken,
      expiresAt: data.expiresAt
    }
  } catch (error: any) {
    console.error(`[PlexAuth] Error checking PIN ${pinId}:`, error.message)
    // Don't throw, just return unauthorized to keep polling safe
    return { authorized: false, error: error.message }
  }
}
