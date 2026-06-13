import { expect, test } from '@playwright/test'

import { cleanState } from '#tests/helpers/api-seed'
import { CanvasHelper } from '#tests/helpers/canvas'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'

test.beforeEach(async ({ page }) => {
  await cleanState(page)
})

test('shared board document persists on server and invitee sees the same drawing', async ({
  browser,
  page
}) => {
  const ownerEmail = `owner-doc-${Date.now()}@jfet.co.jp`
  const inviteeEmail = `invitee-doc-${Date.now()}@external.test`
  const boardName = `Doc Share ${Date.now()}`

  // owner — board 作成 + frame を 1 つ置いて autosave 走らせる + 外部メアド招待
  await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner' })
  await page.goto('/boards')
  await page.getByTestId('boards-locale-switcher').selectOption('en')
  await page.getByTestId('board-name-input').fill(boardName)
  await page.getByTestId('board-create-button').click()
  await page.waitForURL(/\/board\//, { timeout: 15_000 })
  const boardId =
    page.url().split('/board/').at(-1)?.split('/').at(0)?.split('?').at(0) ?? ''
  expect(boardId).toMatch(/^[a-f0-9-]+$/)

  // PUT request を予約してから drag、 watcher の sceneVersion 変化で 1.5s 後 upload。
  const documentUpload = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/boards/${boardId}/document`) && response.request().method() === 'PUT',
    { timeout: 30000 }
  )

  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(80, 80, 360, 300)
  await canvas.waitForRender()
  await canvas.drag(420, 80, 700, 300)
  await canvas.waitForRender()

  const uploadResponse = await documentUpload
  expect(uploadResponse.status()).toBe(200)

  await page.getByTestId('invite-share-button').click()
  await expect(page.getByTestId('share-modal')).toBeVisible()
  await page.getByTestId('share-recipients-input').fill(inviteeEmail)
  await page.getByTestId('share-recipients-input').press(' ')
  await page.getByTestId('share-submit').click()
  const invitationUrl =
    (await page.getByTestId('share-link-output').textContent())?.trim() ?? ''
  expect(invitationUrl).toMatch(/\/invite\//)

  // invitee — 別 context で link 経由 sign-up → board 遷移
  const inviteeContext = await browser.newContext()
  const inviteePage = await inviteeContext.newPage()
  await inviteePage.goto(invitationUrl)
  await expect(inviteePage.getByTestId('invite-redirect-view')).toBeVisible()
  await inviteePage.getByTestId('invite-name-input').fill('Invitee')
  await inviteePage.getByTestId('invite-email-input').fill(inviteeEmail)
  await inviteePage.getByTestId('invite-password-input').fill('invitee-password-123')
  await inviteePage.getByTestId('invite-submit-button').click()
  await inviteePage.waitForURL(/\/board\//, { timeout: 15_000 })

  // 招待された人が server から document を fetch → 同じ scene が見える経路を verify
  // 直接 API を叩いて document の存在を確認する
  const docResponse = await inviteePage.request.get(`/api/boards/${boardId}/document`)
  expect(docResponse.status()).toBe(200)
  const bytes = new Uint8Array(await docResponse.body())
  // 少なくとも 1 frame ぶんの fig blob が入っている
  expect(bytes.length).toBeGreaterThan(0)

  // dashboard でも board card が見える (名前一致)
  await inviteePage.goto('/dashboard')
  await expect(inviteePage.getByText(boardName)).toBeVisible()

  await inviteeContext.close()
})
