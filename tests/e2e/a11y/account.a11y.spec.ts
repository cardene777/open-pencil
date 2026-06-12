import { expect, test } from '@playwright/test'

import { runA11yScan, expectNoCriticalViolations } from '#tests/helpers/a11y'
import { cleanState } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { waitForVisualReady } from '#tests/helpers/visual'

test.describe('account accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  // PR #141 で /account は auth 必須化された。 anonymous で /account を開くと LP redirect
  // されるため、 anonymous 向け a11y scan は意味を成さない。 LP 側の a11y は LP 自体の
  // a11y test で別途検査する。

  test('signed-in state has no critical accessibility violations', async ({ page }) => {
    await mockGoogleLogin(page, {
      email: 'account-a11y-user@jfet.co.jp',
      name: 'Account A11y User'
    })

    await page.goto('/account')
    await expect(page.getByTestId('account-profile')).toBeVisible()
    await waitForVisualReady(page)

    const results = await runA11yScan(page)
    expectNoCriticalViolations(results)
  })
})
