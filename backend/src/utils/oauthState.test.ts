import {
  InvalidOAuthStateError,
  computeCodeChallenge,
  generateCodeVerifier,
  generateState,
  openOAuthState,
  sealOAuthState,
} from './oauthState'

describe('oauthState util', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.OAUTH_STATE_SECRET = 'o'.repeat(64)
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('generateCodeVerifier / computeCodeChallenge', () => {
    it('verifier is base64url and non-trivial length', () => {
      const v = generateCodeVerifier()
      expect(v).toMatch(/^[A-Za-z0-9_-]{40,}$/)
    })

    it('challenge is deterministic from verifier', () => {
      const v = generateCodeVerifier()
      expect(computeCodeChallenge(v)).toEqual(computeCodeChallenge(v))
    })

    it('challenge differs between verifiers', () => {
      expect(computeCodeChallenge(generateCodeVerifier())).not.toEqual(
        computeCodeChallenge(generateCodeVerifier()),
      )
    })
  })

  describe('generateState', () => {
    it('returns a fresh base64url value on each call', () => {
      const a = generateState()
      const b = generateState()
      expect(a).not.toEqual(b)
      expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })

  describe('seal / open', () => {
    it('roundtrips the payload', () => {
      const payload = { state: 'abc', codeVerifier: 'def', issuedAt: Date.now() }
      const sealed = sealOAuthState(payload)
      expect(openOAuthState(sealed)).toEqual(payload)
    })

    it('rejects a tampered body', () => {
      const sealed = sealOAuthState({
        state: 'abc',
        codeVerifier: 'def',
        issuedAt: Date.now(),
      })
      const [body, sig] = sealed.split('.')
      const tamperedBody = body.slice(0, -1) + (body.endsWith('A') ? 'B' : 'A')
      expect(() => openOAuthState(`${tamperedBody}.${sig}`)).toThrow(InvalidOAuthStateError)
    })

    it('rejects a tampered signature', () => {
      const sealed = sealOAuthState({
        state: 'abc',
        codeVerifier: 'def',
        issuedAt: Date.now(),
      })
      const [body, sig] = sealed.split('.')
      const tamperedSig = sig.slice(0, -1) + (sig.endsWith('f') ? '0' : 'f')
      expect(() => openOAuthState(`${body}.${tamperedSig}`)).toThrow(InvalidOAuthStateError)
    })

    it('rejects a payload signed with a different secret', () => {
      const sealed = sealOAuthState({
        state: 'abc',
        codeVerifier: 'def',
        issuedAt: Date.now(),
      })
      process.env.OAUTH_STATE_SECRET = 'x'.repeat(64)
      expect(() => openOAuthState(sealed)).toThrow(InvalidOAuthStateError)
    })

    it('rejects an expired payload (older than 5 min)', () => {
      const sealed = sealOAuthState({
        state: 'abc',
        codeVerifier: 'def',
        issuedAt: Date.now() - 10 * 60 * 1000,
      })
      expect(() => openOAuthState(sealed)).toThrow(/expired/i)
    })

    it('rejects malformed input', () => {
      expect(() => openOAuthState('not-sealed')).toThrow(InvalidOAuthStateError)
      expect(() => openOAuthState('a.b.c')).toThrow(InvalidOAuthStateError)
    })

    it('fails to seal when secret is missing or too short', () => {
      delete process.env.OAUTH_STATE_SECRET
      expect(() => sealOAuthState({ state: 'a', codeVerifier: 'b', issuedAt: Date.now() })).toThrow(
        /OAUTH_STATE_SECRET/,
      )
    })
  })
})
