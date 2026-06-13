import { expect, test } from '@playwright/test'

import { cleanState } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'

test.beforeEach(async ({ page }) => {
  await cleanState(page)
})

test('redeem invitation with email + password binds collaborator and lists board on dashboard', async ({
  browser,
  page
}) => {
  const inviterEmail = `inviter-${Date.now()}@jfet.co.jp`
  // invitee は guest 経路を踏ませるため jfet 外
  const inviteeEmail = `invitee-${Date.now()}@external.test`
  const inviteePassword = 'invitee-password-123'
  const boardName = `Invite Password ${Date.now()}`

  // 1) host (Google 経由 inviter) — board 作成
  await mockGoogleLogin(page, { email: inviterEmail, name: 'Inviter' })
  await page.goto('/boards')
  await page.getByTestId('boards-locale-switcher').selectOption('en')
  await page.getByTestId('board-name-input').fill(boardName)
  await page.getByTestId('board-create-button').click()
  await page.waitForURL(/\/board\//, { timeout: 15_000 })
  const boardId = page.url().split('/board/').at(-1)?.split('/').at(0) ?? ''

  // 2) Editor の共有ボタンから share modal を開き external email を chip 化 → invitation URL を取得
  await page.getByTestId('invite-share-button').click()
  await expect(page.getByTestId('share-modal')).toBeVisible()
  await page.getByTestId('share-recipients-input').fill(inviteeEmail)
  await page.getByTestId('share-recipients-input').press(' ')
  await page.getByTestId('share-submit').click()
  const invitationUrl =
    (await page.getByTestId('share-link-output').textContent())?.trim() ?? ''
  expect(invitationUrl).toMatch(/\/invite\//)

  // 3) 招待された人 (新規 user) — invite URL を別 context で開いて email + password で redeem
  const inviteeContext = await browser.newContext()
  const inviteePage = await inviteeContext.newPage()
  await inviteePage.goto(invitationUrl)

  await expect(inviteePage.getByTestId('invite-redirect-view')).toBeVisible()
  await expect(inviteePage.getByTestId('invite-mode-signup')).toBeVisible()

  await inviteePage.getByTestId('invite-name-input').fill('Invitee User')
  await inviteePage.getByTestId('invite-email-input').fill(inviteeEmail)
  await inviteePage.getByTestId('invite-password-input').fill(inviteePassword)
  await inviteePage.getByTestId('invite-submit-button').click()

  // 4) redeem 後 board に到達 (collaborator 化済を意味する)
  await inviteePage.waitForURL(/\/board\//, { timeout: 15_000 })

  // 5) /dashboard へ戻ると guest dashboard で board が表示される
  await inviteePage.goto('/dashboard')
  await expect(inviteePage.getByTestId('guest-dashboard-view')).toBeVisible()
  await expect(inviteePage.getByText(boardName)).toBeVisible()

  await inviteeContext.close()
})
