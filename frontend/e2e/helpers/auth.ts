import { Page, expect, request } from '@playwright/test'

const apiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.PLAYWRIGHT_API_URL ||
  'http://localhost:3001/api/v1'

export interface SeededSession {
  accessToken: string
  user: { id: string; email: string; name: string; avatarUrl: string | null }
  cookies: Array<{
    name: string
    value: string
    domain?: string
    path?: string
    expires?: number
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  }>
}

/**
 * Hits the backend's test-login backdoor (enabled only when the backend
 * has ALLOW_TEST_LOGIN=true set) and returns the issued access token +
 * refresh cookies. Use `seedAuthenticatedPage` to apply them to a Page
 * before navigation.
 */
export const loginViaBackdoor = async (
  email = 'e2e@example.com',
  name = 'E2E User',
): Promise<SeededSession> => {
  const ctx = await request.newContext({ baseURL: apiBaseUrl() })
  const res = await ctx.post('/auth/test-login', { data: { email, name } })
  if (!res.ok()) {
    throw new Error(
      `Test login failed (${res.status()}). Ensure the backend runs with ALLOW_TEST_LOGIN=true.`,
    )
  }
  const body = (await res.json()) as { data: Omit<SeededSession, 'cookies'> }
  const cookies = (await ctx.storageState()).cookies
  await ctx.dispose()
  return { ...body.data, cookies }
}

/**
 * Injects the refresh cookie and an in-memory access-token bootstrap into
 * the page before navigation so the AuthProvider's silent /auth/refresh
 * on mount succeeds and the user lands in the authenticated state.
 */
export const seedAuthenticatedPage = async (
  page: Page,
  session: SeededSession,
): Promise<void> => {
  await page.context().addCookies(
    session.cookies.map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain ?? 'localhost',
      path: c.path ?? '/',
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    })),
  )
}

export const expectSignedIn = async (page: Page): Promise<void> => {
  await expect(page.getByTestId('user-badge')).toBeVisible()
}
