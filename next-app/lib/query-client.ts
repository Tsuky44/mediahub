import { QueryClient, isServer } from '@tanstack/react-query'

/**
 * Default staleTime of 5s avoids immediate refetches on mount.
 * gcTime (formerly cacheTime) keeps inactive data for 5 minutes.
 */
function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 5,
                gcTime: 1000 * 60 * 5,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    })
}

let browserQueryClient: QueryClient | undefined

/**
 * Côté serveur (SSR) : un client neuf par requête — jamais de cache partagé entre utilisateurs.
 * Côté navigateur : un singleton, conservé entre les navigations.
 */
export function getQueryClient(): QueryClient {
    if (isServer) return makeQueryClient()
    browserQueryClient ??= makeQueryClient()
    return browserQueryClient
}
