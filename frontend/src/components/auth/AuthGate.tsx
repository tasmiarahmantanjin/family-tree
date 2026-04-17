'use client'

import { FC, ReactNode, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

interface AuthGateProps {
  children: ReactNode
}

const PUBLIC_PATHS = ['/login', '/auth/callback']

const isPublic = (pathname: string | null): boolean => {
  if (!pathname) return false
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Client-side gate that routes the user to `/login` when they don't have
 * a session. Shows a minimal "checking session" placeholder while the
 * AuthProvider is still bootstrapping so protected content never flashes.
 */
const AuthGate: FC<AuthGateProps> = ({ children }) => {
  const { status } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const publicRoute = isPublic(pathname)

  useEffect(() => {
    if (status === 'anonymous' && !publicRoute) {
      router.replace('/login')
    }
  }, [status, publicRoute, router])

  if (publicRoute) {
    return <>{children}</>
  }

  if (status === 'bootstrapping') {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div
          className="text-sm text-slate-500"
          data-testid="auth-bootstrapping"
          role="status"
          aria-live="polite"
        >
          Checking session…
        </div>
      </main>
    )
  }

  if (status === 'anonymous') {
    // While the redirect effect above is running, don't render protected content.
    return null
  }

  return <>{children}</>
}

export default AuthGate
