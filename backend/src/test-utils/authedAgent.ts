import { User } from '../models'
import { AuthProvider } from '../types/auth'
import { signAccessToken } from '../utils/jwt'

export interface AuthedUser {
  user: User
  accessToken: string
  authHeader: string
}

let counter = 0

/**
 * Creates a fresh user directly in the DB and signs a valid access token for
 * them. Use in integration tests that need to hit `requireAuth`-protected
 * endpoints without going through the full OAuth flow.
 */
export const createAuthedUser = async (
  overrides: Partial<{ email: string; name: string }> = {},
): Promise<AuthedUser> => {
  counter += 1
  const email = overrides.email ?? `test-${Date.now()}-${counter}@example.com`
  const name = overrides.name ?? `Test User ${counter}`
  const user = await User.create({
    email,
    name,
    provider: AuthProvider.GOOGLE,
    providerId: `test-provider-id-${Date.now()}-${counter}`,
  })
  const accessToken = signAccessToken({ sub: user.id, email: user.email })
  return { user, accessToken, authHeader: `Bearer ${accessToken}` }
}
