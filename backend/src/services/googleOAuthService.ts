import { GoogleUserInfo } from '../types/auth'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

const GOOGLE_REQUEST_TIMEOUT_MS = 5000

interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

const getConfig = (): GoogleOAuthConfig => {
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI } =
    process.env
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REDIRECT_URI) {
    throw new Error(
      'Missing Google OAuth configuration. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI.',
    )
  }
  return {
    clientId: GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: GOOGLE_OAUTH_REDIRECT_URI,
  }
}

export const buildAuthUrl = (state: string, codeChallenge: string): string => {
  const { clientId, redirectUri } = getConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export class GoogleOAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GoogleOAuthError'
  }
}

export const exchangeCodeForTokens = async (
  code: string,
  codeVerifier: string,
): Promise<{ accessToken: string }> => {
  const { clientId, clientSecret, redirectUri } = getConfig()
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    // Google's error body can echo the authorization code or client identifiers;
    // log it server-side for diagnostics but never surface it in the thrown error.
    const text = await res.text().catch(() => '')
    console.error('[googleOAuthService] token exchange failed', { status: res.status, body: text })
    throw new GoogleOAuthError('Google token exchange failed')
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new GoogleOAuthError('Google token exchange returned no access_token')
  }
  return { accessToken: json.access_token }
}

export const fetchUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(GOOGLE_REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new GoogleOAuthError(`Google userinfo failed: ${res.status}`)
  }
  const json = (await res.json()) as Partial<GoogleUserInfo>
  if (
    typeof json.sub !== 'string' ||
    typeof json.email !== 'string' ||
    typeof json.name !== 'string'
  ) {
    throw new GoogleOAuthError('Google userinfo missing required fields')
  }
  return {
    sub: json.sub,
    email: json.email,
    email_verified: json.email_verified === true,
    name: json.name,
    picture: json.picture,
  }
}
