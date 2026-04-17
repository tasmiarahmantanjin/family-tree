import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

export interface AuthInterceptorHooks {
  getAccessToken: () => string | null
  onRefresh: () => Promise<string | null>
  onSignOut: () => void
}

/**
 * Wires request + response interceptors so that:
 * 1. every request carries `Authorization: Bearer <accessToken>` when one
 *    is available in memory;
 * 2. a single 401 triggers exactly one `/auth/refresh` call, even when
 *    many requests fail concurrently — later 401s wait on the in-flight
 *    refresh and then replay with the new token;
 * 3. if the refresh itself fails, the caller receives the original 401
 *    and the session is torn down via `onSignOut`.
 *
 * Returns a detach function that removes both interceptors.
 */
export const installAuthInterceptors = (
  client: AxiosInstance,
  { getAccessToken, onRefresh, onSignOut }: AuthInterceptorHooks,
): (() => void) => {
  let refreshPromise: Promise<string | null> | null = null

  const requestId = client.interceptors.request.use((config) => {
    const token = getAccessToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  const responseId = client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as RetryableConfig | undefined
      const status = error.response?.status
      const url = original?.url ?? ''

      // Never recurse on /auth/* endpoints — the AuthProvider calls
      // /auth/refresh directly and handles its own failures.
      const isAuthEndpoint = url.startsWith('/auth') || url.includes('/auth/')

      if (status !== 401 || !original || original._retried || isAuthEndpoint) {
        return Promise.reject(error)
      }

      original._retried = true

      if (!refreshPromise) {
        refreshPromise = onRefresh().finally(() => {
          refreshPromise = null
        })
      }

      const nextToken = await refreshPromise
      if (!nextToken) {
        onSignOut()
        return Promise.reject(error)
      }

      original.headers = original.headers ?? {}
      original.headers.Authorization = `Bearer ${nextToken}`
      return client.request(original)
    },
  )

  return () => {
    client.interceptors.request.eject(requestId)
    client.interceptors.response.eject(responseId)
  }
}
