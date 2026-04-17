import { CookieOptions, Request, Response } from 'express'
import { User } from '../models'
import { asyncHandler } from '../utils/asyncHandler'
import { StatusCode } from '../types'
import {
  OAUTH_STATE_COOKIE_MAX_AGE_MS,
  OAUTH_STATE_COOKIE_NAME,
  computeCodeChallenge,
  generateCodeVerifier,
  generateState,
  InvalidOAuthStateError,
  openOAuthState,
  sealOAuthState,
} from '../utils/oauthState'
import {
  buildAuthUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  GoogleOAuthError,
} from '../services/googleOAuthService'
import {
  IssuedSession,
  SessionContext,
  UnauthorizedError,
  issueSession,
  revokeRefreshToken,
  rotateRefreshToken,
  upsertGoogleUser,
} from '../services/authService'

const REFRESH_COOKIE_NAME = 'ft_refresh'
const REFRESH_COOKIE_PATH = '/api/v1/auth'

const isProd = (): boolean => process.env.NODE_ENV === 'production'

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd(),
  sameSite: 'lax',
  path: REFRESH_COOKIE_PATH,
  domain: process.env.COOKIE_DOMAIN || undefined,
})

const setRefreshCookie = (res: Response, token: string, expiresAt: Date): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    expires: expiresAt,
  })
}

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions())
}

const setStateCookie = (res: Response, sealed: string): void => {
  res.cookie(OAUTH_STATE_COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE_MS,
  })
}

const clearStateCookie = (res: Response): void => {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/api/v1/auth',
  })
}

const sessionContext = (req: Request): SessionContext => ({
  userAgent: req.get('user-agent') ?? null,
  ip: req.ip ?? null,
})

const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
})

const sendSession = (res: Response, session: IssuedSession, status: number) => {
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt)
  res.status(status).json({
    data: {
      user: publicUser(session.user),
      accessToken: session.accessToken,
    },
  })
}

const startGoogleOAuth = asyncHandler(async (_req, res) => {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const sealed = sealOAuthState({ state, codeVerifier, issuedAt: Date.now() })
  setStateCookie(res, sealed)
  res.redirect(buildAuthUrl(state, computeCodeChallenge(codeVerifier)))
})

const getAppUrl = (): string => {
  const url = process.env.APP_URL
  if (!url) {
    throw new Error('APP_URL must be configured for OAuth redirects')
  }
  return url.replace(/\/$/, '')
}

const googleOAuthCallback = asyncHandler(async (req, res) => {
  const sealed = req.cookies?.[OAUTH_STATE_COOKIE_NAME] as string | undefined
  clearStateCookie(res)
  if (!sealed) {
    throw new UnauthorizedError('Missing OAuth state cookie')
  }
  let payload
  try {
    payload = openOAuthState(sealed)
  } catch (err) {
    if (err instanceof InvalidOAuthStateError) {
      throw new UnauthorizedError('Invalid OAuth state')
    }
    throw err
  }

  const returnedState = typeof req.query.state === 'string' ? req.query.state : ''
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  if (!returnedState || returnedState !== payload.state) {
    throw new UnauthorizedError('OAuth state mismatch')
  }
  if (!code) {
    throw new UnauthorizedError('Missing authorization code')
  }

  let googleAccessToken: string
  try {
    const tokens = await exchangeCodeForTokens(code, payload.codeVerifier)
    googleAccessToken = tokens.accessToken
  } catch (err) {
    if (err instanceof GoogleOAuthError) {
      throw new UnauthorizedError('Failed to exchange authorization code')
    }
    throw err
  }

  const profile = await fetchUserInfo(googleAccessToken)
  const user = await upsertGoogleUser(profile)
  const session = await issueSession(user, sessionContext(req))
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt)

  const target = new URL(`${getAppUrl()}/auth/callback`)
  target.hash = `accessToken=${encodeURIComponent(session.accessToken)}`
  res.redirect(target.toString())
})

const refresh = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
  if (!presented) {
    throw new UnauthorizedError('Missing refresh token')
  }
  try {
    const session = await rotateRefreshToken(presented, sessionContext(req))
    sendSession(res, session, StatusCode.OK)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      clearRefreshCookie(res)
    }
    throw err
  }
})

const logout = asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined
  if (presented) {
    await revokeRefreshToken(presented)
  }
  clearRefreshCookie(res)
  res.status(StatusCode.NO_CONTENT).send()
})

const me = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new UnauthorizedError()
  }
  const user = await User.findByPk(req.user.id)
  if (!user || !user.isActive) {
    throw new UnauthorizedError('Account not found or disabled')
  }
  res.status(StatusCode.OK).json({ data: publicUser(user) })
})

// Test-only backdoor to seed a session without going through Google. Enabled
// strictly when ALLOW_TEST_LOGIN === 'true' (off by default in every env,
// including tests that exercise the real flow). E2E tests set this flag to
// avoid needing a real Google OAuth app during CI.
export const isTestLoginEnabled = (): boolean => process.env.ALLOW_TEST_LOGIN === 'true'

const testLogin = asyncHandler(async (req, res) => {
  if (!isTestLoginEnabled()) {
    throw new UnauthorizedError('Test login is disabled')
  }
  const body = (req.body ?? {}) as { email?: unknown; name?: unknown }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'Test User'
  if (!email) {
    throw new UnauthorizedError('email is required')
  }
  const providerId = `test:${email}`
  const [user] = await User.findOrCreate({
    where: { provider: 'google' as const, providerId },
    defaults: {
      provider: 'google' as const,
      providerId,
      email,
      name,
    },
  })
  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled')
  }
  await user.update({ email, name, lastLoginAt: new Date() })
  const session = await issueSession(user, sessionContext(req))
  sendSession(res, session, StatusCode.OK)
})

export default {
  startGoogleOAuth,
  googleOAuthCallback,
  refresh,
  logout,
  me,
  testLogin,
}
