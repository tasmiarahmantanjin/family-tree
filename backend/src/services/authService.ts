import { Op } from 'sequelize'
import sequelize from '../config/database'
import { RefreshToken, User } from '../models'
import { AppError } from '../middleware/errorHandler'
import { AuthProvider, GoogleUserInfo, UserAttributes } from '../types/auth'
import { StatusCode } from '../types'
import { generateOpaqueToken, hashToken } from '../utils/tokens'
import { parseRefreshExpiryMs, signAccessToken } from '../utils/jwt'

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, StatusCode.UNAUTHORIZED)
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export interface SessionContext {
  userAgent?: string | null
  ip?: string | null
}

export interface IssuedSession {
  user: User
  accessToken: string
  refreshToken: string
  refreshTokenId: string
  refreshExpiresAt: Date
}

export const upsertGoogleUser = async (profile: GoogleUserInfo): Promise<User> => {
  if (!profile.email_verified) {
    throw new UnauthorizedError('Google account email is not verified')
  }
  const nextEmail = profile.email.toLowerCase()
  const [user] = await User.findOrCreate({
    where: { provider: AuthProvider.GOOGLE, providerId: profile.sub },
    defaults: {
      provider: AuthProvider.GOOGLE,
      providerId: profile.sub,
      email: nextEmail,
      name: profile.name,
      avatarUrl: profile.picture ?? null,
    },
  })
  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled')
  }
  const updates: Partial<UserAttributes> = {}
  if (user.email !== nextEmail) updates.email = nextEmail
  if (user.name !== profile.name) updates.name = profile.name
  const nextAvatar = profile.picture ?? null
  if (user.avatarUrl !== nextAvatar) updates.avatarUrl = nextAvatar
  updates.lastLoginAt = new Date()
  await user.update(updates)
  return user
}

const buildAccessPayload = (user: User) => ({ sub: user.id, email: user.email })

export const issueSession = async (
  user: User,
  context: SessionContext = {},
): Promise<IssuedSession> => {
  const accessToken = signAccessToken(buildAccessPayload(user))
  const refreshToken = generateOpaqueToken()
  const refreshExpiresAt = new Date(Date.now() + parseRefreshExpiryMs())
  const row = await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: context.userAgent ?? null,
    ip: context.ip ?? null,
  })
  return {
    user,
    accessToken,
    refreshToken,
    refreshTokenId: row.id,
    refreshExpiresAt,
  }
}

const revokeFamily = async (startId: string): Promise<void> => {
  const ids = new Set<string>([startId])
  let frontier = [startId]
  while (frontier.length > 0) {
    const rows = await RefreshToken.findAll({
      where: { id: { [Op.in]: frontier } },
      attributes: ['replacedByTokenId'],
    })
    frontier = []
    for (const r of rows) {
      const next = r.replacedByTokenId
      if (next && !ids.has(next)) {
        ids.add(next)
        frontier.push(next)
      }
    }
  }
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { id: { [Op.in]: Array.from(ids) }, revokedAt: { [Op.is]: null } } },
  )
}

// Thrown from inside the rotation transaction when we detect a replay of a
// revoked token. The outer catch translates it to an UnauthorizedError AFTER
// revoking the token family on a separate connection — if revokeFamily ran
// inside the failing transaction it would be rolled back on throw.
class RevokedRefreshTokenError extends Error {
  constructor(public readonly rowId: string) {
    super('Refresh token has been revoked')
    Object.setPrototypeOf(this, RevokedRefreshTokenError.prototype)
  }
}

export const rotateRefreshToken = async (
  presentedToken: string,
  context: SessionContext = {},
): Promise<IssuedSession> => {
  if (!presentedToken) {
    throw new UnauthorizedError('Missing refresh token')
  }
  const tokenHash = hashToken(presentedToken)

  try {
    return await sequelize.transaction(async (t) => {
      // Lock the presented-token row for the duration of the transaction so
      // that two concurrent refreshes cannot both succeed and create a fork.
      const row = await RefreshToken.findOne({
        where: { tokenHash },
        transaction: t,
        lock: t.LOCK.UPDATE,
      })
      if (!row) {
        throw new UnauthorizedError('Invalid refresh token')
      }
      if (row.revokedAt) {
        // Signal the outer catch to revoke the family on a fresh connection.
        throw new RevokedRefreshTokenError(row.id)
      }
      if (row.expiresAt.getTime() < Date.now()) {
        throw new UnauthorizedError('Refresh token has expired')
      }
      const user = await User.findByPk(row.userId, { transaction: t })
      if (!user || !user.isActive) {
        throw new UnauthorizedError('Account is disabled')
      }

      const newRefresh = generateOpaqueToken()
      const newExpiresAt = new Date(Date.now() + parseRefreshExpiryMs())
      const newRow = await RefreshToken.create(
        {
          userId: user.id,
          tokenHash: hashToken(newRefresh),
          expiresAt: newExpiresAt,
          userAgent: context.userAgent ?? null,
          ip: context.ip ?? null,
        },
        { transaction: t },
      )
      await row.update({ revokedAt: new Date(), replacedByTokenId: newRow.id }, { transaction: t })

      return {
        user,
        accessToken: signAccessToken(buildAccessPayload(user)),
        refreshToken: newRefresh,
        refreshTokenId: newRow.id,
        refreshExpiresAt: newExpiresAt,
      }
    })
  } catch (err) {
    if (err instanceof RevokedRefreshTokenError) {
      await revokeFamily(err.rowId)
      throw new UnauthorizedError('Refresh token has been revoked')
    }
    throw err
  }
}

export const revokeRefreshToken = async (presentedToken: string): Promise<void> => {
  if (!presentedToken) return
  const row = await RefreshToken.findOne({ where: { tokenHash: hashToken(presentedToken) } })
  if (!row || row.revokedAt) return
  await row.update({ revokedAt: new Date() })
}
