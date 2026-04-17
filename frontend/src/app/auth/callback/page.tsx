'use client'

import { FC, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/axios'
import { fetchMe } from '@/lib/auth'

/**
 * The backend completes the OAuth flow by redirecting here with
 * `#accessToken=<token>` in the URL fragment. We move the token into
 * memory via the AuthProvider, strip it from the URL so it never ends up
 * in browser history, fetch the current user, then redirect to `/`.
 */
const AuthCallbackPage: FC = () => {
  const router = useRouter()
  const { setSession } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const hash = window.location.hash.replace(/^#/, '')
    const params = new URLSearchParams(hash)
    const accessToken = params.get('accessToken')

    if (!accessToken) {
      // Synchronising React state with the external OAuth redirect result.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Missing access token')
      return
    }

    // Scrub the token out of the URL immediately.
    window.history.replaceState(null, '', window.location.pathname)

    // Attach the token for the /auth/me call via a one-shot request
    // interceptor; the AuthProvider interceptor isn't seeded yet because
    // setSession hasn't run.
    const interceptorId = apiClient.interceptors.request.use((config) => {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${accessToken}`
      return config
    })

    fetchMe()
      .then((me) => {
        setSession(me, accessToken)
        router.replace('/')
      })
      .catch(() => {
        setError('Could not complete sign-in. Please try again.')
      })
      .finally(() => {
        apiClient.interceptors.request.eject(interceptorId)
      })
  }, [router, setSession])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-3">
        {error ? (
          <>
            <h1 className="text-lg font-semibold text-slate-800">Sign-in failed</h1>
            <p className="text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => router.replace('/login')}
              className="mt-2 inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-slate-800">Signing you in…</h1>
            <p className="text-sm text-slate-500">One moment.</p>
          </>
        )}
      </div>
    </main>
  )
}

export default AuthCallbackPage
