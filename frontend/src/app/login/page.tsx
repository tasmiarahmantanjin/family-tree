'use client'

import { FC, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const BrandMark: FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
)

const FEATURES = [
  'Visualize parent–child relationships across generations',
  'Sign in with Google — no passwords to manage',
  'Your data stays in your own database, always',
]

// Decorative 3-generation tree, purely visual.
const TREE_NODES: Array<[number, number]> = [
  [200, 20],
  [100, 70],
  [300, 70],
  [50, 120],
  [150, 120],
  [250, 120],
  [350, 120],
]
const TREE_LINES: Array<[number, number, number, number]> = [
  [200, 20, 100, 70],
  [200, 20, 300, 70],
  [100, 70, 50, 120],
  [100, 70, 150, 120],
  [300, 70, 250, 120],
  [300, 70, 350, 120],
]

const LoginPage: FC = () => {
  const { status, loginWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/')
    }
  }, [status, router])

  const loading = status === 'bootstrapping'

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-slate-50 text-slate-800">
      {/* ────────────── Hero panel (desktop only) ────────────── */}
      <aside className="relative hidden overflow-hidden bg-slate-900 text-slate-100 lg:flex">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 12%, rgba(148,163,184,0.22), transparent 45%), radial-gradient(circle at 82% 88%, rgba(99,102,241,0.18), transparent 50%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'><circle cx='1' cy='1' r='1' fill='white'/></svg>\")",
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <BrandMark className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm tracking-wide text-slate-300">Family Tree</span>
          </div>

          <div className="max-w-md space-y-8">
            <h1 className="text-4xl font-semibold leading-tight text-white xl:text-[2.75rem]">
              Preserve your family&rsquo;s story, one connection at a time.
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-300">
              Map generations, capture birthplaces, and watch every branch come together in a single
              living view — shared with the people who matter.
            </p>

            <ul className="space-y-3 pt-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                    <svg
                      className="h-3 w-3 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <svg
            aria-hidden="true"
            viewBox="0 0 400 140"
            className="w-full max-w-md text-slate-400/70"
          >
            <g stroke="currentColor" strokeWidth="1" fill="none">
              {TREE_LINES.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
            </g>
            <g>
              {TREE_NODES.map(([cx, cy], i) => (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="8" fill="currentColor" opacity="0.15" />
                  <circle cx={cx} cy={cy} r="4" fill="currentColor" />
                </g>
              ))}
            </g>
          </svg>
        </div>
      </aside>

      {/* ────────────── Sign-in panel ────────────── */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <BrandMark className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold tracking-tight text-slate-800">Family Tree</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
            <p className="text-[15px] leading-relaxed text-slate-500">
              Sign in to view and edit your family tree. It only takes a second.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loading}
              data-testid="google-signin"
              className="group inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] font-medium text-slate-800 shadow-sm hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-300 disabled:hover:shadow-sm"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
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
              <span>{loading ? 'Checking session…' : 'Continue with Google'}</span>
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-3 text-xs uppercase tracking-[0.12em] text-slate-400">
                  Secure sign-in
                </span>
              </div>
            </div>

            <p className="text-center text-xs leading-relaxed text-slate-500">
              We only read your name, email, and profile picture from Google. We never post on your
              behalf or access any other data.
            </p>
          </div>

          <p className="mt-14 text-center text-xs text-slate-400">
            Need access? Ask your family tree admin to invite you.
          </p>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
