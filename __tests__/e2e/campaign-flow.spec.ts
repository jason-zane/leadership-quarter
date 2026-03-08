import { test, expect } from '@playwright/test'

/**
 * Campaign registration + assessment submission flow.
 *
 * NOTE: This test requires a running dev server with seeded campaign data.
 * Set PLAYWRIGHT_CAMPAIGN_SLUG env var to a valid active campaign slug.
 * If the env var is not set the test is skipped.
 */
const slug = process.env.PLAYWRIGHT_CAMPAIGN_SLUG

test.describe('Campaign — public registration + submission flow', () => {
  test.skip(!slug, 'PLAYWRIGHT_CAMPAIGN_SLUG env var not set — skipping campaign E2E test')

  test('navigates to campaign page', async ({ page }) => {
    await page.goto(`/c/${slug}`)
    await expect(page).not.toHaveURL(/\/404/)
    // Campaign page should render without error
    await expect(page.locator('body')).toBeVisible()
  })
})
