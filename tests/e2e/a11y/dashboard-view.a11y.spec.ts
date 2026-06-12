import { expect, test } from '@playwright/test'

import { runA11yScan, expectNoCriticalViolations } from '#tests/helpers/a11y'
import { cleanState, seedBoards } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { waitForVisualReady } from '#tests/helpers/visual'

const dashboardViewDisabledRules = [
  // TODO(cardene): contrast on accent CTA / metric cards follow-up
  'color-contrast'
]

test.describe('dashboard view accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  // PR #141 で /dashboard は auth 必須化された。 anonymous で /dashboard を開くと LP redirect
  // されるため、 anonymous 向け a11y scan は意味を成さない。 LP 側の a11y は LP 自体の
  // a11y test で別途検査する。

  test('populated state has no critical accessibility violations', async ({ page }) => {
    await mockGoogleLogin(page, {
      email: 'dashboard-view-a11y-populated@jfet.co.jp',
      name: 'Dashboard View A11y Populated'
    })
    await seedBoards(page, 3)

    await page.goto('/dashboard')
    await expect(page.getByTestId('dashboard-recent-list')).toBeVisible()
    await waitForVisualReady(page)

    const results = await runA11yScan(page, {
      disableRules: dashboardViewDisabledRules
    })
    expectNoCriticalViolations(results)
  })
})
