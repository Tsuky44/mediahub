import { QueryClient } from '@tanstack/react-query'

/**
 * Singleton QueryClient for the application.
 * Default staleTime of 5s avoids immediate refetches on mount.
 * gcTime (formerly cacheTime) keeps inactive data for 5 minutes.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 5,
            gcTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})
