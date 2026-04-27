/**
 * Centralised API client wrapping native fetch.
 * Provides automatic JSON handling, error normalisation,
 * and a typed request/response interface.
 */

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
    timeoutMs?: number
}

class ApiClient {
    private baseUrl: string

    constructor() {
        this.baseUrl = ''
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        options: RequestOptions = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`
        const headers: HeadersInit = {
            Accept: 'application/json',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...((options.headers as Record<string, string>) || {}),
        }

        const controller = new AbortController()
        const timeoutId = options.timeoutMs
            ? setTimeout(() => controller.abort(), options.timeoutMs)
            : undefined

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
                ...options,
            })

            if (!res.ok) {
                let errorData: unknown
                try {
                    errorData = await res.json()
                } catch {
                    errorData = undefined
                }
                throw new ApiError(
                    res.status,
                    (errorData as { message?: string })?.message || `HTTP ${res.status}`,
                    errorData
                )
            }

            if (res.status === 204) {
                return undefined as T
            }

            return (await res.json()) as T
        } finally {
            if (timeoutId) clearTimeout(timeoutId)
        }
    }

    get<T>(path: string, options?: RequestOptions): Promise<T> {
        return this.request<T>('GET', path, undefined, options)
    }

    post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>('POST', path, body, options)
    }

    patch<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>('PATCH', path, body, options)
    }

    put<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
        return this.request<T>('PUT', path, body, options)
    }

    delete<T>(path: string, options?: RequestOptions): Promise<T> {
        return this.request<T>('DELETE', path, undefined, options)
    }
}

export const api = new ApiClient()
