import { expect, test } from '@playwright/test'

import { cleanState } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { expectModal } from '#tests/helpers/interaction'

test.describe('account interaction', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  // PR #141 で /account は auth 必須化された。 anonymous で /account を開くと LP redirect
  // されるため、 anonymous 向け login button 表示 test は無意味になった。 削除して LP 側の
  // landing-nav-login button 検証は LP 自体の test に委ねる。

  test('logged in user sees profile and logout button', async ({ page }) => {
    await mockGoogleLogin(page, { email: 'profile@jfet.co.jp', name: 'Profile User' })
    await page.goto('/account')

    await expect(page.getByTestId('account-profile')).toBeVisible()
    await expect(page.getByTestId('account-name')).toContainText('Profile User')
    await expect(page.getByTestId('account-email')).toContainText('profile@jfet.co.jp')
    await expect(page.getByTestId('account-logout-button')).toBeVisible()
  })

  test('logout dialog cancel keeps the session', async ({ page }) => {
    await mockGoogleLogin(page, { email: 'logout@jfet.co.jp', name: 'Logout User' })
    await page.goto('/account')

    await page.getByTestId('account-logout-button').click()
    await expectModal(page, 'account-logout-dialog', { open: true })

    await page.getByTestId('account-logout-cancel').click()
    await expectModal(page, 'account-logout-dialog', { open: false })
    await expect(page.getByTestId('account-profile')).toBeVisible()
  })
})
