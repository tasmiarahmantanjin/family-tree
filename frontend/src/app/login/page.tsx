'use client'

import { FC, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const LoginPage: FC = () => {
  const { status, loginWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [status, router])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-800">Welcome to Family Tree</h1>
          <p className="text-slate-500 text-sm">
            Sign in with your Google account to view and edit the family tree.
          </p>
        </div>
        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={status === 'bootstrapping'}
          data-testid="google-signin"
          className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.3-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.5 0-14 4.3-17.7 10.2z"
            />
            <path
              fill="#4CAF50"
              d="M24 43.5c5 0 9.5-1.9 13-5l-6-5c-2 1.5-4.4 2.4-7 2.4-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.9 39.2 16.4 43.5 24 43.5z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6 5c4-3.7 6.5-9.1 6.5-14.7 0-1.2-.1-2.3-.3-3.5z"
            />
          </svg>
          Continue with Google
        </button>
      </div>
    </main>
  )
}

export default LoginPage
