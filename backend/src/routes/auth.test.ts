import nock from 'nock'
import request from 'supertest'
import app from '../app'
import sequelize from '../config/database'
import { RefreshToken, User } from '../models'
import { OAUTH_STATE_COOKIE_NAME, sealOAuthState } from '../utils/oauthState'

const extractCookie = (res: request.Response, name: string): string | undefined => {
  const raw = res.headers['set-cookie']
  if (!raw) return undefined
  const arr = Array.isArray(raw) ? raw : [raw]
  const match = arr.find((c: string) => c.startsWith(`${name}=`))
  if (!match) return undefined
  return match.split(';')[0].split('=')[1]
}

const hasClearedCookie = (res: request.Response, name: string): boolean => {
  const raw = res.headers['set-cookie']
  if (!raw) return false
  const arr = Array.isArray(raw) ? raw : [raw]
  return arr.some((c: string) => c.startsWith(`${name}=`) && /Expires=Thu, 01 Jan 1970/i.test(c))
}

describe('auth routes (integration)', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
    nock.disableNetConnect()
    nock.enableNetConnect((host) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))
  })

  afterAll(async () => {
    nock.cleanAll()
    nock.enableNetConnect()
    await sequelize.close()
  })

  beforeEach(async () => {
    nock.cleanAll()
    await RefreshToken.destroy({ where: {} })
    await User.destroy({ where: {} })
  })

  describe('GET /api/v1/auth/google', () => {
    it('redirects to Google with state + PKCE challenge and sets the state cookie', async () => {
      const res = await request(app).get('/api/v1/auth/google').redirects(0)
      expect(res.status).toBe(302)
      const location = res.headers.location as string
      expect(location).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      const url = new URL(location)
      expect(url.searchParams.get('response_type')).toBe('code')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(url.searchParams.get('scope')).toContain('openid')
      expect(url.searchParams.get('scope')).toContain('email')
      expect(url.searchParams.get('state')).toBeTruthy()
      expect(url.searchParams.get('code_challenge')).toBeTruthy()
      expect(extractCookie(res, OAUTH_STATE_COOKIE_NAME)).toBeTruthy()
    })
  })

  describe('GET /api/v1/auth/google/callback', () => {
    const sealWith = (state: string, codeVerifier: string): string =>
      sealOAuthState({ state, codeVerifier, issuedAt: Date.now() })

    const mockGoogleExchange = (codeVerifier: string) =>
      nock('https://oauth2.googleapis.com')
        .post('/token', (body: Record<string, string>) => body.code_verifier === codeVerifier)
        .reply(200, { access_token: 'google-access-token' })

    const mockGoogleUserinfo = (profile: Record<string, unknown>) =>
      nock('https://openidconnect.googleapis.com')
        .get('/v1/userinfo')
        .matchHeader('authorization', 'Bearer google-access-token')
        .reply(200, profile)

    it('completes the flow: exchanges code, creates user, issues JWT, redirects to APP_URL', async () => {
      const state = 'state-xyz'
      const verifier = 'verifier-xyz'
      mockGoogleExchange(verifier)
      mockGoogleUserinfo({
        sub: 'google-1',
        email: 'alice@example.com',
        email_verified: true,
        name: 'Alice',
        picture: 'https://example.com/a.png',
      })

      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'auth-code' })
        .set('Cookie', [`${OAUTH_STATE_COOKIE_NAME}=${sealWith(state, verifier)}`])
        .redirects(0)

      expect(res.status).toBe(302)
      expect(res.headers.location).toMatch(/http:\/\/localhost:3000\/auth\/callback#accessToken=/)
      expect(extractCookie(res, 'ft_refresh')).toBeTruthy()

      const user = await User.findOne({ where: { providerId: 'google-1' } })
      expect(user).not.toBeNull()
      expect(user!.email).toBe('alice@example.com')

      const tokens = await RefreshToken.findAll({ where: { userId: user!.id } })
      expect(tokens).toHaveLength(1)
      // Refresh token is only stored hashed.
      expect(tokens[0].tokenHash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('rejects when the OAuth state cookie is missing', async () => {
      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state: 'x', code: 'c' })
        .redirects(0)
      expect(res.status).toBe(401)
    })

    it('rejects when the returned state does not match the cookie', async () => {
      const verifier = 'v'
      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state: 'wrong', code: 'c' })
        .set('Cookie', [`${OAUTH_STATE_COOKIE_NAME}=${sealWith('right', verifier)}`])
        .redirects(0)
      expect(res.status).toBe(401)
    })

    it('rejects an unverified Google email', async () => {
      const state = 's'
      const verifier = 'v'
      mockGoogleExchange(verifier)
      mockGoogleUserinfo({
        sub: 'g-1',
        email: 'unverified@example.com',
        email_verified: false,
        name: 'Nope',
      })
      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'code' })
        .set('Cookie', [`${OAUTH_STATE_COOKIE_NAME}=${sealWith(state, verifier)}`])
        .redirects(0)
      expect(res.status).toBe(401)
    })

    it('rejects when Google token exchange fails', async () => {
      const state = 's'
      const verifier = 'v'
      nock('https://oauth2.googleapis.com').post('/token').reply(400, 'bad')
      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'code' })
        .set('Cookie', [`${OAUTH_STATE_COOKIE_NAME}=${sealWith(state, verifier)}`])
        .redirects(0)
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    const completeOAuth = async (sub = 'google-1', email = 'alice@example.com') => {
      const state = 'st'
      const verifier = 'vf'
      nock('https://oauth2.googleapis.com').post('/token').reply(200, { access_token: 'g' })
      nock('https://openidconnect.googleapis.com')
        .get('/v1/userinfo')
        .reply(200, { sub, email, email_verified: true, name: 'A' })
      const res = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'c' })
        .set('Cookie', [
          `${OAUTH_STATE_COOKIE_NAME}=${sealOAuthState({ state, codeVerifier: verifier, issuedAt: Date.now() })}`,
        ])
        .redirects(0)
      const refresh = extractCookie(res, 'ft_refresh')!
      return refresh
    }

    it('rotates refresh + returns new access token', async () => {
      const refresh = await completeOAuth()
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`ft_refresh=${refresh}`])
      expect(res.status).toBe(200)
      expect(res.body.data.accessToken).toEqual(expect.any(String))
      expect(res.body.data.user.email).toBe('alice@example.com')
      const rotated = extractCookie(res, 'ft_refresh')
      expect(rotated).toBeTruthy()
      expect(rotated).not.toBe(refresh)
    })

    it('rejects when the refresh cookie is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh')
      expect(res.status).toBe(401)
    })

    it('rejects a garbage refresh cookie without leaking whether it was structurally valid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['ft_refresh=not-a-real-token'])
      expect(res.status).toBe(401)
      expect(hasClearedCookie(res, 'ft_refresh')).toBe(true)
    })

    it('rejects and clears the cookie on replay of a revoked token', async () => {
      const first = await completeOAuth()
      await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`ft_refresh=${first}`])
        .expect(200)
      const replay = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`ft_refresh=${first}`])
      expect(replay.status).toBe(401)
      expect(hasClearedCookie(replay, 'ft_refresh')).toBe(true)
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('revokes the refresh token and clears the cookie', async () => {
      const state = 'st'
      const verifier = 'vf'
      nock('https://oauth2.googleapis.com').post('/token').reply(200, { access_token: 'g' })
      nock('https://openidconnect.googleapis.com')
        .get('/v1/userinfo')
        .reply(200, { sub: 'g-2', email: 'b@example.com', email_verified: true, name: 'B' })
      const login = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'c' })
        .set('Cookie', [
          `${OAUTH_STATE_COOKIE_NAME}=${sealOAuthState({ state, codeVerifier: verifier, issuedAt: Date.now() })}`,
        ])
        .redirects(0)
      const refresh = extractCookie(login, 'ft_refresh')!

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [`ft_refresh=${refresh}`])
      expect(res.status).toBe(204)
      expect(hasClearedCookie(res, 'ft_refresh')).toBe(true)

      // Using the logged-out refresh must now fail.
      const reuse = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`ft_refresh=${refresh}`])
      expect(reuse.status).toBe(401)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('requires auth', async () => {
      const res = await request(app).get('/api/v1/auth/me')
      expect(res.status).toBe(401)
    })

    it('rejects a still-valid access token whose user has been deactivated', async () => {
      const state = 'st'
      const verifier = 'vf'
      nock('https://oauth2.googleapis.com').post('/token').reply(200, { access_token: 'g' })
      nock('https://openidconnect.googleapis.com')
        .get('/v1/userinfo')
        .reply(200, { sub: 'g-off', email: 'off@example.com', email_verified: true, name: 'O' })
      const login = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'c' })
        .set('Cookie', [
          `${OAUTH_STATE_COOKIE_NAME}=${sealOAuthState({ state, codeVerifier: verifier, issuedAt: Date.now() })}`,
        ])
        .redirects(0)
      const hash = new URL(login.headers.location as string).hash
      const accessToken = decodeURIComponent(hash.replace('#accessToken=', ''))
      await User.update({ isActive: false }, { where: { providerId: 'g-off' } })
      const me = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(me.status).toBe(401)
    })

    it('returns the current user given a valid access token', async () => {
      const state = 'st'
      const verifier = 'vf'
      nock('https://oauth2.googleapis.com').post('/token').reply(200, { access_token: 'g' })
      nock('https://openidconnect.googleapis.com')
        .get('/v1/userinfo')
        .reply(200, { sub: 'g-3', email: 'c@example.com', email_verified: true, name: 'C' })
      const login = await request(app)
        .get('/api/v1/auth/google/callback')
        .query({ state, code: 'c' })
        .set('Cookie', [
          `${OAUTH_STATE_COOKIE_NAME}=${sealOAuthState({ state, codeVerifier: verifier, issuedAt: Date.now() })}`,
        ])
        .redirects(0)
      const location = login.headers.location as string
      const hash = new URL(location).hash
      const accessToken = decodeURIComponent(hash.replace('#accessToken=', ''))

      const me = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(me.status).toBe(200)
      expect(me.body.data.email).toBe('c@example.com')
      expect(me.body.data.name).toBe('C')
    })
  })
})
