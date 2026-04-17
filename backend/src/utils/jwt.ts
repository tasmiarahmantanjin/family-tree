import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { AccessTokenPayload } from '../types/auth'

const getAccessSecret = (): string => {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set and at least 32 characters long')
  }
  return secret
}

const getAccessExpiry = (): string => process.env.JWT_ACCESS_EXPIRY || '15m'

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, getAccessSecret(), {
    algorithm: 'HS256',
    expiresIn: getAccessExpiry() as jwt.SignOptions['expiresIn'],
  })

export class InvalidTokenError extends Error {
  constructor(message = 'Invalid or expired token') {
    super(message)
    this.name = 'InvalidTokenError'
  }
}

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, getAccessSecret(), { algorithms: ['HS256'] })
    if (typeof decoded !== 'object' || decoded === null) {
      throw new InvalidTokenError()
    }
    const { sub, email } = decoded as jwt.JwtPayload
    if (typeof sub !== 'string' || typeof email !== 'string') {
      throw new InvalidTokenError()
    }
    return { sub, email }
  } catch (err) {
    if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
      throw new InvalidTokenError()
    }
    throw err
  }
}

export const parseRefreshExpiryMs = (): number => {
  const raw = process.env.JWT_REFRESH_EXPIRY || '7d'
  const match = raw.match(/^(\d+)\s*(s|m|h|d)$/)
  if (!match) {
    throw new Error(`Invalid JWT_REFRESH_EXPIRY format: ${raw}. Use e.g. "7d", "12h", "30m".`)
  }
  const n = Number.parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }
  return n * multipliers[unit]
}
