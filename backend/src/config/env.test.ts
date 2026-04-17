import { validateAuthEnv } from './env'

const baseline = (): NodeJS.ProcessEnv => ({
  JWT_ACCESS_SECRET: 'a'.repeat(64),
  OAUTH_STATE_SECRET: 'b'.repeat(64),
  GOOGLE_OAUTH_CLIENT_ID: 'client',
  GOOGLE_OAUTH_CLIENT_SECRET: 'secret',
  GOOGLE_OAUTH_REDIRECT_URI: 'https://api/auth/google/callback',
  APP_URL: 'https://app',
  NODE_ENV: 'production',
})

describe('validateAuthEnv', () => {
  it('accepts a fully-populated, distinct, sufficiently-long config', () => {
    expect(() => validateAuthEnv(baseline())).not.toThrow()
  })

  it('throws when any required var is missing', () => {
    const env = baseline()
    delete env.APP_URL
    expect(() => validateAuthEnv(env)).toThrow(/APP_URL/)
  })

  it('throws when JWT secret is too short', () => {
    expect(() => validateAuthEnv({ ...baseline(), JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    )
  })

  it('throws when OAuth state secret is too short', () => {
    expect(() => validateAuthEnv({ ...baseline(), OAUTH_STATE_SECRET: 'short' })).toThrow(
      /OAUTH_STATE_SECRET/,
    )
  })

  it('throws when JWT and OAuth state secrets are identical', () => {
    const secret = 'c'.repeat(64)
    expect(() =>
      validateAuthEnv({
        ...baseline(),
        JWT_ACCESS_SECRET: secret,
        OAUTH_STATE_SECRET: secret,
      }),
    ).toThrow(/distinct/)
  })

  it('refuses ALLOW_TEST_LOGIN=true in production', () => {
    expect(() => validateAuthEnv({ ...baseline(), ALLOW_TEST_LOGIN: 'true' })).toThrow(
      /ALLOW_TEST_LOGIN/,
    )
  })

  it('allows ALLOW_TEST_LOGIN=true outside production', () => {
    expect(() =>
      validateAuthEnv({ ...baseline(), NODE_ENV: 'development', ALLOW_TEST_LOGIN: 'true' }),
    ).not.toThrow()
  })
})
