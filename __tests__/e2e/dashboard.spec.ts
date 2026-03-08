import { test, expect } from '@playwright/test'

/**
 * Dashboard login + navigation smoke tests.
 *
 * NOTE: These tests require a running dev server with valid admin credentials
 * provided via PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD env vars.
 * If not set the tests are skipped to avoid blocking CI without credentials.
 */
const adminEmail = process.env.PLAYWRIGHT_ADMIN_EMAIL
const adminPassword = process.env.PLAYWRIGHT_ADMIN_PASSWORD

test.describe('Dashboard — authentication and navigation', () => {
  test.skip(!adminEmail || !adminPassword, 'PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD not set — skipping dashboard E2E tests')

  test('login page renders', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('admin can sign in and reach campaigns dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', adminEmail!)
    await page.fill('input[type="password"]', adminPassword!)
    await page.click('button[type="submit"]')

    // After login, should be redirected away from /login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 })

    // Navigate to campaigns
    await page.goto('/dashboard/campaigns')
    await expect(page).toHaveURL(/dashboard\/campaigns/)
    // Page should render without a fatal error
    await expect(page.locator('body')).toBeVisible()
  })
})
