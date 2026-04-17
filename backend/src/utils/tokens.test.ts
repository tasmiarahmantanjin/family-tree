import { generateOpaqueToken, hashToken } from './tokens'

describe('tokens util', () => {
  describe('generateOpaqueToken', () => {
    it('produces a 64-char hex string (32 bytes)', () => {
      const t = generateOpaqueToken()
      expect(t).toMatch(/^[0-9a-f]{64}$/)
    })

    it('returns a fresh value on each call', () => {
      const a = generateOpaqueToken()
      const b = generateOpaqueToken()
      expect(a).not.toEqual(b)
    })
  })

  describe('hashToken', () => {
    it('is deterministic for the same input', () => {
      expect(hashToken('abc')).toEqual(hashToken('abc'))
    })

    it('differs for different inputs', () => {
      expect(hashToken('abc')).not.toEqual(hashToken('abd'))
    })

    it('produces a 64-char hex string (sha256)', () => {
      expect(hashToken('xyz')).toMatch(/^[0-9a-f]{64}$/)
    })

    it('never returns the plaintext', () => {
      expect(hashToken('secret')).not.toContain('secret')
    })
  })
})
