import jwt from 'jsonwebtoken'
import { InvalidTokenError, parseRefreshExpiryMs, signAccessToken, verifyAccessToken } from './jwt'

describe('jwt util', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'a'.repeat(64)
    process.env.JWT_ACCESS_EXPIRY = '15m'
    process.env.JWT_REFRESH_EXPIRY = '7d'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('signAccessToken / verifyAccessToken', () => {
    it('roundtrips payload', () => {
      const token = signAccessToken({ sub: 'user-1', email: 'a@b.c' })
      const payload = verifyAccessToken(token)
      expect(payload).toEqual({ sub: 'user-1', email: 'a@b.c' })
    })

    it('rejects a token signed with a different secret', () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'a@b.c' },
        'different-secret-of-sufficient-length',
        {
          algorithm: 'HS256',
        },
      )
      expect(() => verifyAccessToken(token)).toThrow(InvalidTokenError)
    })

    it('rejects an expired token', () => {
      process.env.JWT_ACCESS_EXPIRY = '1ms'
      // Give jsonwebtoken a duration it recognises but which expires immediately on verify.
      const token = jwt.sign({ sub: 'user-1', email: 'a@b.c' }, process.env.JWT_ACCESS_SECRET!, {
        algorithm: 'HS256',
        expiresIn: -1,
      })
      expect(() => verifyAccessToken(token)).toThrow(InvalidTokenError)
    })

    it('rejects malformed tokens', () => {
      expect(() => verifyAccessToken('not-a-token')).toThrow(InvalidTokenError)
    })

    it('rejects a tampered signature', () => {
      const token = signAccessToken({ sub: 'u', email: 'e' })
      const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa')
      expect(() => verifyAccessToken(tampered)).toThrow(InvalidTokenError)
    })

    it('fails to sign when secret is missing or too short', () => {
      delete process.env.JWT_ACCESS_SECRET
      expect(() => signAccessToken({ sub: 'u', email: 'e' })).toThrow(/JWT_ACCESS_SECRET/)
      process.env.JWT_ACCESS_SECRET = 'short'
      expect(() => signAccessToken({ sub: 'u', email: 'e' })).toThrow(/JWT_ACCESS_SECRET/)
    })
  })

  describe('parseRefreshExpiryMs', () => {
    it('parses days', () => {
      process.env.JWT_REFRESH_EXPIRY = '7d'
      expect(parseRefreshExpiryMs()).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('parses hours', () => {
      process.env.JWT_REFRESH_EXPIRY = '3h'
      expect(parseRefreshExpiryMs()).toBe(3 * 60 * 60 * 1000)
    })

    it('parses minutes', () => {
      process.env.JWT_REFRESH_EXPIRY = '30m'
      expect(parseRefreshExpiryMs()).toBe(30 * 60 * 1000)
    })

    it('parses seconds', () => {
      process.env.JWT_REFRESH_EXPIRY = '45s'
      expect(parseRefreshExpiryMs()).toBe(45 * 1000)
    })

    it('defaults to 7 days when unset', () => {
      delete process.env.JWT_REFRESH_EXPIRY
      expect(parseRefreshExpiryMs()).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('throws on invalid format', () => {
      process.env.JWT_REFRESH_EXPIRY = 'forever'
      expect(() => parseRefreshExpiryMs()).toThrow(/JWT_REFRESH_EXPIRY/)
    })
  })
})
