import { RefreshToken, User } from '../models'
import sequelize from '../config/database'
import {
  UnauthorizedError,
  issueSession,
  revokeRefreshToken,
  rotateRefreshToken,
  upsertGoogleUser,
} from './authService'
import { AuthProvider, GoogleUserInfo } from '../types/auth'
import { hashToken } from '../utils/tokens'

const baseProfile: GoogleUserInfo = {
  sub: 'google-user-1',
  email: 'a@example.com',
  email_verified: true,
  name: 'Alice',
  picture: 'https://example.com/a.png',
}

describe('authService', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await RefreshToken.destroy({ where: {} })
    await User.destroy({ where: {} })
  })

  describe('upsertGoogleUser', () => {
    it('creates a new user on first login', async () => {
      const user = await upsertGoogleUser(baseProfile)
      expect(user.email).toBe('a@example.com')
      expect(user.provider).toBe(AuthProvider.GOOGLE)
      expect(user.providerId).toBe('google-user-1')
      expect(user.name).toBe('Alice')
      expect(user.isActive).toBe(true)
      expect(user.lastLoginAt).toBeInstanceOf(Date)
    })

    it('returns the same user on repeat logins and updates lastLoginAt', async () => {
      const first = await upsertGoogleUser(baseProfile)
      const firstLogin = first.lastLoginAt as Date
      await new Promise((r) => setTimeout(r, 10))
      const second = await upsertGoogleUser(baseProfile)
      expect(second.id).toBe(first.id)
      expect((second.lastLoginAt as Date).getTime()).toBeGreaterThan(firstLogin.getTime())
    })

    it('updates email / name / avatar when Google profile changes', async () => {
      await upsertGoogleUser(baseProfile)
      const updated = await upsertGoogleUser({
        ...baseProfile,
        email: 'renamed@example.com',
        name: 'Alice Renamed',
        picture: 'https://example.com/new.png',
      })
      expect(updated.email).toBe('renamed@example.com')
      expect(updated.name).toBe('Alice Renamed')
      expect(updated.avatarUrl).toBe('https://example.com/new.png')
    })

    it('rejects an unverified Google email', async () => {
      await expect(
        upsertGoogleUser({ ...baseProfile, email_verified: false }),
      ).rejects.toBeInstanceOf(UnauthorizedError)
    })

    it('rejects when the existing user is deactivated', async () => {
      const user = await upsertGoogleUser(baseProfile)
      await user.update({ isActive: false })
      await expect(upsertGoogleUser(baseProfile)).rejects.toBeInstanceOf(UnauthorizedError)
    })
  })

  describe('issueSession', () => {
    it('creates a refresh-token row storing only the hash', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const session = await issueSession(user, { userAgent: 'ua', ip: '1.2.3.4' })
      expect(session.accessToken).toEqual(expect.any(String))
      expect(session.refreshToken).toMatch(/^[0-9a-f]{64}$/)
      const row = await RefreshToken.findByPk(session.refreshTokenId)
      expect(row).not.toBeNull()
      expect(row!.tokenHash).toBe(hashToken(session.refreshToken))
      expect(row!.tokenHash).not.toBe(session.refreshToken)
      expect(row!.userAgent).toBe('ua')
      expect(row!.ip).toBe('1.2.3.4')
      expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('rotateRefreshToken', () => {
    it('issues a new token and revokes the old one, linking them', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const first = await issueSession(user)
      const rotated = await rotateRefreshToken(first.refreshToken)
      expect(rotated.refreshToken).not.toBe(first.refreshToken)
      const oldRow = await RefreshToken.findByPk(first.refreshTokenId)
      expect(oldRow!.revokedAt).toBeInstanceOf(Date)
      expect(oldRow!.replacedByTokenId).toBe(rotated.refreshTokenId)
    })

    it('detects replay of a revoked token and revokes the whole family', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const first = await issueSession(user)
      const second = await rotateRefreshToken(first.refreshToken)
      const third = await rotateRefreshToken(second.refreshToken)
      // An attacker replays the original (already-revoked) refresh.
      await expect(rotateRefreshToken(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError)
      // The entire family should now be revoked.
      const rows = await RefreshToken.findAll({ where: { userId: user.id } })
      for (const r of rows) {
        expect(r.revokedAt).toBeInstanceOf(Date)
      }
      // And subsequent use of the most-recently-issued token is rejected.
      await expect(rotateRefreshToken(third.refreshToken)).rejects.toBeInstanceOf(UnauthorizedError)
    })

    it('rejects an unknown refresh token', async () => {
      await expect(rotateRefreshToken('deadbeef'.repeat(8))).rejects.toBeInstanceOf(
        UnauthorizedError,
      )
    })

    it('rejects a missing refresh token', async () => {
      await expect(rotateRefreshToken('')).rejects.toBeInstanceOf(UnauthorizedError)
    })

    it('rejects an expired refresh token', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const session = await issueSession(user)
      await RefreshToken.update(
        { expiresAt: new Date(Date.now() - 1000) },
        { where: { id: session.refreshTokenId } },
      )
      await expect(rotateRefreshToken(session.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )
    })

    it('rejects when the user is deactivated', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const session = await issueSession(user)
      await user.update({ isActive: false })
      await expect(rotateRefreshToken(session.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedError,
      )
    })

    it('serializes concurrent rotations so exactly one succeeds', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const session = await issueSession(user)
      const results = await Promise.allSettled([
        rotateRefreshToken(session.refreshToken),
        rotateRefreshToken(session.refreshToken),
      ])
      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r) => r.status === 'rejected')
      expect(fulfilled).toHaveLength(1)
      expect(rejected).toHaveLength(1)
      // The original row should have exactly one replacement — no fork.
      const original = await RefreshToken.findByPk(session.refreshTokenId)
      expect(original!.replacedByTokenId).not.toBeNull()
      const children = await RefreshToken.findAll({
        where: { replacedByTokenId: session.refreshTokenId },
      })
      expect(children).toHaveLength(0)
    })
  })

  describe('revokeRefreshToken', () => {
    it('marks the row as revoked', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const session = await issueSession(user)
      await revokeRefreshToken(session.refreshToken)
      const row = await RefreshToken.findByPk(session.refreshTokenId)
      expect(row!.revokedAt).toBeInstanceOf(Date)
    })

    it('is a no-op for unknown tokens', async () => {
      await expect(revokeRefreshToken('unknown')).resolves.toBeUndefined()
    })

    it('is idempotent on an already-revoked token', async () => {
      const user = await upsertGoogleUser(baseProfile)
      const session = await issueSession(user)
      await revokeRefreshToken(session.refreshToken)
      const rowBefore = await RefreshToken.findByPk(session.refreshTokenId)
      const firstRevokedAt = rowBefore!.revokedAt
      await revokeRefreshToken(session.refreshToken)
      const rowAfter = await RefreshToken.findByPk(session.refreshTokenId)
      expect(rowAfter!.revokedAt).toEqual(firstRevokedAt)
    })
  })
})
