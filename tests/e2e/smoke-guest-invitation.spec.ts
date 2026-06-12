import { expect, test } from '@playwright/test'

import { cleanState, seedBoards, seedInvitations } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'

test.describe('guest sign-up invitation check', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  test('sign-up without invitation is rejected', async ({ page }) => {
    await page.goto('/login/guest')
    await expect(page.getByTestId('guest-login-view')).toBeVisible()

    // sign-up tab に切替
    await page.getByTestId('guest-login-mode-signup').click()

    await page.getByTestId('guest-login-name-input').fill('Uninvited Guest')
    await page
      .getByTestId('guest-login-email-input')
      .fill(`uninvited-${Date.now()}@example.com`)
    await page.getByTestId('guest-login-password-input').fill('password-123')

    await page.getByTestId('guest-login-submit').click()

    await expect(page.getByTestId('guest-login-error')).toContainText('招待を受けていない')
  })

  test('sign-up with active invitation succeeds', async ({ page }) => {
    // 招待を seed するには board owner として login して invite を作る
    await mockGoogleLogin(page, {
      email: 'inviter@jfet.co.jp',
      name: 'Board Inviter'
    })
    const [board] = await seedBoards(page, 1)
    const inviteeEmail = `invited-${Date.now()}@example.com`
    await seedInvitations(page, board.id, [inviteeEmail])

    // logout して guest login にアクセス
    await page.context().clearCookies()
    await page.goto('/login/guest')

    await page.getByTestId('guest-login-mode-signup').click()
    await page.getByTestId('guest-login-name-input').fill('Invited Guest')
    await page.getByTestId('guest-login-email-input').fill(inviteeEmail)
    await page.getByTestId('guest-login-password-input').fill('password-123')
    await page.getByTestId('guest-login-submit').click()

    // 招待があるので submit 成功 → returnTo (default /dashboard) に遷移
    await page.waitForURL(/\/dashboard|\/boards|\/$/, { timeout: 10_000 })
  })

  test('duplicate sign-up is rejected with explicit error message', async ({ page }) => {
    // 1 回目: 招待 + sign-up 完了
    await mockGoogleLogin(page, {
      email: 'inviter-dup@jfet.co.jp',
      name: 'Dup Inviter'
    })
    const [board] = await seedBoards(page, 1)
    const dupEmail = `dup-${Date.now()}@example.com`
    await seedInvitations(page, board.id, [dupEmail])

    await page.context().clearCookies()
    await page.goto('/login/guest')
    await page.getByTestId('guest-login-mode-signup').click()
    await page.getByTestId('guest-login-name-input').fill('Dup Guest')
    await page.getByTestId('guest-login-email-input').fill(dupEmail)
    await page.getByTestId('guest-login-password-input').fill('password-123')
    await page.getByTestId('guest-login-submit').click()
    await page.waitForURL(/\/dashboard|\/boards|\/$/, { timeout: 10_000 })

    // 2 回目: 同じ email で sign-up 試行 → 重複エラー + sign-in tab に切替
    await page.context().clearCookies()
    await page.goto('/login/guest')
    await page.getByTestId('guest-login-mode-signup').click()
    await page.getByTestId('guest-login-name-input').fill('Dup Guest 2')
    await page.getByTestId('guest-login-email-input').fill(dupEmail)
    await page.getByTestId('guest-login-password-input').fill('password-123')
    await page.getByTestId('guest-login-submit').click()

    await expect(page.getByTestId('guest-login-error')).toContainText(/アカウントが既に存在/)
    // sign-in tab に自動切替
    await expect(page.getByTestId('guest-login-mode-signin')).toHaveClass(/bg-accent/)
  })
})
