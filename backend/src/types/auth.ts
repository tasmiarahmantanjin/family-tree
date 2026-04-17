export const AuthProvider = {
  GOOGLE: 'google',
} as const

export type AuthProviderType = (typeof AuthProvider)[keyof typeof AuthProvider]

export interface UserAttributes {
  id?: string
  email: string
  name: string
  avatarUrl?: string | null
  provider: AuthProviderType
  providerId: string
  isActive?: boolean
  lastLoginAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

export interface RefreshTokenAttributes {
  id?: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt?: Date | null
  replacedByTokenId?: string | null
  userAgent?: string | null
  ip?: string | null
  createdAt?: Date
}

export interface AuthenticatedUser {
  id: string
  email: string
}

export interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  picture?: string
}

export interface AccessTokenPayload {
  sub: string
  email: string
}
