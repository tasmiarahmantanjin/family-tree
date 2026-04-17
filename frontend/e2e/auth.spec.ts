import { expect, test } from '@playwright/test'
import { expectSignedIn, loginViaBackdoor, seedAuthenticatedPage } from './helpers/auth'

test.describe('Authentication', () => {
  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('google-signin')).toBeVisible()
  })

  test('"Continue with Google" button points at the backend OAuth start', async ({ page }) => {
    await page.goto('/login')
    const button = page.getByTestId('google-signin')
    await expect(button).toBeVisible()
    // Rather than following the redirect (which would hit real Google), assert
    // the click kicks off navigation to the backend OAuth entrypoint.
    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes('/api/v1/auth/google')),
      button.click(),
    ])
    expect(request.url()).toContain('/api/v1/auth/google')
  })

  test('a seeded session bootstraps the authenticated UI on /', async ({ page }) => {
    const session = await loginViaBackdoor('auth-happy@example.com', 'Happy Path')
    await seedAuthenticatedPage(page, session)
    await page.goto('/')
    await expectSignedIn(page)
    await expect(page.getByTestId('user-name')).toContainText('Happy Path')
  })

  test('session persists across a full page reload', async ({ page }) => {
    const session = await loginViaBackdoor('persist@example.com', 'Persist User')
    await seedAuthenticatedPage(page, session)
    await page.goto('/')
    await expectSignedIn(page)
    await page.reload()
    await expectSignedIn(page)
  })

  test('logout clears the session and redirects to /login', async ({ page }) => {
    const session = await loginViaBackdoor('logout@example.com', 'Logout User')
    await seedAuthenticatedPage(page, session)
    await page.goto('/')
    await expectSignedIn(page)
    await page.getByTestId('logout-button').click()
    await expect(page).toHaveURL(/\/login$/)
    // Reload after logout — still signed out.
    await page.reload()
    await expect(page).toHaveURL(/\/login$/)
  })
})
