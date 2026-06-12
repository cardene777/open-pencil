import { expect, test } from '@playwright/test'

import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { cleanState } from '#tests/helpers/api-seed'
import { expectPageScreenshot } from '#tests/helpers/visual'

test.describe('account visual regression', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  // PR #141 で /account は auth 必須化された。 anonymous で /account を開くと LP
  // redirect されるため visual snapshot 対象から外す。 LP 自体の visual は LP 側で別途。

  test('logged in state', async ({ page }) => {
    await mockGoogleLogin(page, {
      email: 'account-user@jfet.co.jp',
      name: 'Account User'
    })

    await page.goto('/account')
    await expect(page.getByTestId('account-profile')).toBeVisible()
    await expectPageScreenshot(page, 'account-logged-in.png')
  })
})
