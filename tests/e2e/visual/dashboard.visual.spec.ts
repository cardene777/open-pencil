import { expect, test } from '@playwright/test'

import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { cleanState, seedBoards } from '#tests/helpers/api-seed'
import { expectPageScreenshot } from '#tests/helpers/visual'

test.describe('dashboard visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  test('empty state', async ({ page }) => {
    await mockGoogleLogin(page, {
      email: 'dashboard-empty@jfet.co.jp',
      name: 'Dashboard Empty'
    })

    await page.goto('/boards')
    await expect(page.getByTestId('boards-view')).toBeVisible()
    await expectPageScreenshot(page, 'dashboard-empty.png')
  })

  test('populated state', async ({ page }) => {
    await mockGoogleLogin(page, {
      email: 'dashboard-populated@jfet.co.jp',
      name: 'Dashboard Populated'
    })
    await seedBoards(page, 3)

    await page.goto('/boards')
    await expect(page.getByTestId('board-card')).toHaveCount(3)
    await expectPageScreenshot(page, 'dashboard-populated.png')
  })

  test('search input state', async ({ page }) => {
    await mockGoogleLogin(page, {
      email: 'dashboard-search@jfet.co.jp',
      name: 'Dashboard Search'
    })
    await seedBoards(page, 3)

    await page.goto('/boards')
    await page.getByTestId('board-search-input').fill('Board 2')
    await expectPageScreenshot(page, 'dashboard-search.png')
  })

  // PR #141 で /boards は auth 必須化された。 anonymous で /boards を開くと LP redirect
  // されるため login-banner は到達不能になった。 該当 visual は削除。
})
