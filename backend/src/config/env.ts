/**
 * Startup validation for auth-related env vars. Called from `index.ts`
 * before the server listens so a missing / mis-configured secret crashes
 * the pod instead of producing runtime 500s on the first auth request.
 *
 * Kept out of `database.ts` intentionally: the test harness short-circuits
 * around auth (e.g. calling services directly) and shouldn't require the
 * full auth env to run; validation is invoked from server bootstrap only.
 */
const required = [
  'JWT_ACCESS_SECRET',
  'OAUTH_STATE_SECRET',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'GOOGLE_OAUTH_REDIRECT_URI',
  'APP_URL',
] as const

const MIN_SECRET_LEN = 32

export const validateAuthEnv = (env: NodeJS.ProcessEnv = process.env): void => {
  const missing = required.filter((k) => !env[k] || !env[k]!.trim())
  if (missing.length > 0) {
    throw new Error(`Auth configuration error: missing required env vars: ${missing.join(', ')}`)
  }

  if ((env.JWT_ACCESS_SECRET as string).length < MIN_SECRET_LEN) {
    throw new Error(`JWT_ACCESS_SECRET must be at least ${MIN_SECRET_LEN} characters`)
  }
  if ((env.OAUTH_STATE_SECRET as string).length < MIN_SECRET_LEN) {
    throw new Error(`OAUTH_STATE_SECRET must be at least ${MIN_SECRET_LEN} characters`)
  }
  if (env.JWT_ACCESS_SECRET === env.OAUTH_STATE_SECRET) {
    throw new Error('JWT_ACCESS_SECRET and OAUTH_STATE_SECRET must be distinct')
  }

  if (env.NODE_ENV === 'production' && env.ALLOW_TEST_LOGIN === 'true') {
    throw new Error('ALLOW_TEST_LOGIN must not be enabled in production')
  }
}
