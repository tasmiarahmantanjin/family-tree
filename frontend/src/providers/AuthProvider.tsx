'use client'

import {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { apiClient, installAuthInterceptors } from '@/lib/axios'
import { AuthUser, googleSignInUrl, logoutSession, refreshSession } from '@/lib/auth'

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  loginWithGoogle: () => void
  logout: () => Promise<void>
  setSession: (user: AuthUser, accessToken: string) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Holds the authenticated user + in-memory access token, silently refreshes
 * the session on mount via the httpOnly refresh cookie, and exposes a
 * `loginWithGoogle` that redirects to the backend OAuth start endpoint.
 *
 * The access token lives in a ref (not localStorage) to keep it out of
 * reach of page-level XSS. Axios interceptors read the ref on every
 * request, and on a 401 they attempt a single refresh and replay the
 * original request — with a queue so concurrent 401s trigger only one
 * refresh.
 */
const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping')
  const [user, setUser] = useState<AuthUser | null>(null)
  const accessTokenRef = useRef<string | null>(null)

  const handleSignOut = useCallback(() => {
    accessTokenRef.current = null
    setUser(null)
    setStatus('anonymous')
  }, [])

  const setSession = useCallback((nextUser: AuthUser, accessToken: string) => {
    accessTokenRef.current = accessToken
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const session = await refreshSession()
      accessTokenRef.current = session.accessToken
      setUser(session.user)
      setStatus('authenticated')
      return session.accessToken
    } catch {
      handleSignOut()
      return null
    }
  }, [handleSignOut])

  const loginWithGoogle = useCallback(() => {
    window.location.href = googleSignInUrl()
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutSession()
    } catch {
      // Best-effort — the server revokes the refresh token, but we always
      // want to drop the local session even if the call fails.
    }
    handleSignOut()
  }, [handleSignOut])

  useEffect(() => {
    const detach = installAuthInterceptors(apiClient, {
      getAccessToken: () => accessTokenRef.current,
      onRefresh: refresh,
      onSignOut: handleSignOut,
    })
    return detach
  }, [refresh, handleSignOut])

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      await refresh()
      if (!cancelled && accessTokenRef.current === null) {
        setStatus('anonymous')
      }
    }
    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [refresh])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, loginWithGoogle, logout, setSession }),
    [status, user, loginWithGoogle, logout, setSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
