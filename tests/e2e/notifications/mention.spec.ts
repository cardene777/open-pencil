import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockGoogleLogin } from '../../helpers/e2e-auth'

test('mentioning a teammate pushes a notification badge update over websocket', async ({
  browser,
  page
}) => {
  // WS の delivery race を吸収するため、 全体タイムアウトを延長し、 個別の assertion
  // でも longer timeout を渡す。 mention notification は team invite + mention の
  // 2 段で WS push が走るので、 複数の assertion で待ち時間が必要。
  test.setTimeout(60_000)

  const teamName = `Mention Team ${Date.now()}`
  const boardName = `Mention Board ${Date.now()}`
  const teammateEmail = `mention-${Date.now()}@jfet.co.jp`

  const teammateContext = await browser.newContext()
  const teammatePage = await teammateContext.newPage()
  await mockGoogleLogin(teammatePage, {
    email: teammateEmail,
    name: 'Mention Teammate'
  })

  await mockGoogleLogin(page, {
    email: 'mention-owner@jfet.co.jp',
    name: 'Mention Owner'
  })

  await page.goto('/teams')
  await expect(page.getByTestId('teams-view')).toBeVisible()
  await page.getByTestId('team-create-button').click()
  await page.getByTestId('team-create-input').fill(teamName)
  await page.getByTestId('team-create-submit').click()

  await expect(page.getByTestId('team-detail-view')).toBeVisible()
  await page.getByTestId('team-detail-invite-button').click()
  await page.getByTestId('team-invite-email-input').fill(teammateEmail)
  await page.getByTestId('team-invite-submit').click()
  await expect(page.getByText(teammateEmail)).toBeVisible()

  await page.goto('/boards')
  await expect(page.getByTestId('boards-view')).toBeVisible()
  await page.getByTestId('board-create-input').fill(boardName)
  await page.getByTestId('board-team-select').selectOption({ label: teamName })
  await page.getByTestId('board-create-button').click()

  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await expect(page.getByTestId('editor-root')).toBeVisible()
  await expect(page.getByTestId('editor-team-badge')).toContainText(teamName)

  await teammatePage.goto('/boards')
  await expect(teammatePage.getByTestId('boards-view')).toBeVisible()
  // team invite 由来の WS push が teammate に届くまで待つ。 vite proxy の WS が
  // ECONNRESET で揺らぐことがあるため timeout を長めに取り、 reload による fallback
  // も用意する。
  await expect(teammatePage.getByTestId('notification-bell-badge')).toHaveText('1', {
    timeout: 15_000
  })

  await page.evaluate(() => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store not initialized')
    const id = store.createShape('TEXT', 220, 220, 260, 32)
    store.select([id])
    store.startTextEditing(id)
  })
  await canvas.waitForRender()
  await page.waitForTimeout(200)
  const hiddenTextarea = page.locator('textarea[aria-hidden="true"]')
  await expect(hiddenTextarea).toHaveCount(1)
  await hiddenTextarea.type(`Heads up @${teammateEmail.slice(0, 8)}`)
  await page.waitForTimeout(200)
  const textEditState = await page.evaluate(() => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store not initialized')
    return {
      editingTextId: store.state.editingTextId,
      text: store.textEditor?.state?.text ?? '',
      cursor: store.textEditor?.state?.cursor ?? null
    }
  })
  expect(textEditState.editingTextId).toBeTruthy()
  expect(textEditState.text).toContain('@')

  const mentionInput = page.getByTestId('mention-input')
  await expect(mentionInput).toBeVisible({ timeout: 15_000 })

  // mention candidates は board 起動時の loadMentionCandidates (team API fetch)
  // 経由で非同期に埋まる。 candidates 空の間は <mention-empty> が表示されるため
  // mention-option が出るまで長め timeout で待つ。
  await expect(page.getByTestId('mention-option').filter({ hasText: teammateEmail })).toBeVisible({
    timeout: 15_000
  })
  await page.getByTestId('mention-option').filter({ hasText: teammateEmail }).click()

  // mention 由来の WS push を待つ (count が 1 → 2 に増えるはず)。 同様に timeout 長めに。
  await expect(teammatePage.getByTestId('notification-bell-badge')).toHaveText('2', {
    timeout: 15_000
  })

  await teammatePage.getByTestId('notification-bell-trigger').click()
  const notificationPopover = teammatePage.getByTestId('notification-bell-popover')
  await expect(notificationPopover).toBeVisible()
  await expect(notificationPopover.getByText(boardName)).toBeVisible({ timeout: 10_000 })

  await teammateContext.close()
})
