import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { seedInternalUsers } from '#tests/helpers/api-seed'
import { getNodeById, getPageChildren } from '#tests/helpers/store'

/**
 * 異 user の owner / invitee で realtime sync が双方向に動く e2e。
 *
 * Issue #232 / PR #233 で対応した「owner の編集が invitee 側でリロード不要で
 * リアルタイム反映される」を、 異 user (= 違う email でログインした 2 アカウント)
 * の owner / invitee BrowserContext で再現検証する。
 *
 * 想定 scenario ...
 *   1. owner email で mockGoogleLogin して board を作成
 *   2. invitee email で mockGoogleLogin (別 BrowserContext)、 続けて invitee を
 *      internalUsers table に seed することで /api/boards/{id}/share が
 *      immediate collaborator 化できる状態にする
 *   3. owner 側から /api/boards/{id}/share を直接呼んで invitee を collaborator 化
 *      (ShareModal UI 経由は別 spec で扱う、 本 spec は sync 経路に focus)
 *   4. invitee context で board URL に goto、 editor-root 表示を確認
 *   5. owner が rectangle を描画 → invitee 側で同 id の node が見える状態に
 *      なるまで poll、 座標が一致することを verify
 *   6. cleanup ... invitee context close
 *
 * 注意 ...
 *   - これは「異 user」を前提とした唯一の collab regression detector。
 *     既存 realtime-sync.spec.ts は同一 user 2 context のため別人扱いでは
 *     ないく、 invitee 側 ACL や applyYnodeToGraph の root 経路を verify できない。
 *   - immediate collaborator 化を成立させるため invitee を internalUsers に
 *     seed する必要がある (PR #236 で seedInternalUsers helper を新設)。
 */
test('owner が rectangle 描画すると invitee 側で同 node が見える (Issue #232 cross-user regression detector)', async ({
  browser,
  page
}) => {
  const boardName = `RealtimeCrossUser ${Date.now()}`
  const ownerEmail = `owner-${Date.now()}@jfet.co.jp`
  const inviteeEmail = `invitee-${Date.now()}@jfet.co.jp`

  await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner User' })
  await page.goto('/boards')
  await page.getByTestId('board-name-input').fill(boardName)
  await page.getByTestId('board-create-button').click()
  await page.waitForURL(/\/board\//, { timeout: 15_000 })
  await expect(page.getByTestId('editor-root')).toBeVisible()

  const boardUrl = page.url()
  const boardId = boardUrl.match(/\/board\/([^/?#]+)/)?.[1] ?? null
  expect(boardId).toBeTruthy()
  if (!boardId) throw new Error('boardId not parsed')

  const ownerCanvas = new CanvasHelper(page)
  await ownerCanvas.waitForInit()

  // invitee の用意 ... 別 context で mockGoogleLogin、 internalUsers seed、 share。
  const inviteeContext = await browser.newContext()
  const inviteePage: Page = await inviteeContext.newPage()
  try {
    await mockGoogleLogin(inviteePage, { email: inviteeEmail, name: 'Invitee User' })

    // invitee を internalUsers table に seed (/api/boards/{id}/share が
    // immediate collaborator 化するための前提条件)。
    const seeded = await seedInternalUsers(inviteePage, [inviteeEmail])
    expect(seeded.length).toBe(1)
    expect(seeded[0].email).toBe(inviteeEmail.toLowerCase())

    // owner 側で invitee を share する。 ShareModal UI 経由ではなく
    // API call で安定性を担保する (本 spec は sync 経路の verify に focus)。
    const shareResponse = await page.request.post(`/api/boards/${boardId}/share`, {
      data: {
        emails: [inviteeEmail],
        role: 'editor'
      }
    })
    expect(shareResponse.ok()).toBeTruthy()
    const sharePayload = (await shareResponse.json()) as {
      added: { email: string; userId: string }[]
      pending: { email: string }[]
      rejected: { email: string; reason: string }[]
    }
    expect(sharePayload.added.length).toBe(1)
    expect(sharePayload.added[0].email).toBe(inviteeEmail.toLowerCase())

    // invitee が board URL を直接開けることを確認 (collaborator として ACL pass)。
    await inviteePage.goto(boardUrl)
    await expect(inviteePage.getByTestId('editor-root')).toBeVisible()

    const inviteeCanvas = new CanvasHelper(inviteePage)
    await inviteeCanvas.waitForInit()

    // owner が rectangle を描画。
    await ownerCanvas.drawRect(120, 120, 120, 80)
    const rectangle = (await getPageChildren(page)).find((node) => node.type === 'RECTANGLE')
    expect(rectangle).toBeTruthy()
    if (!rectangle) throw new Error('Expected rectangle to be created on owner side')

    // invitee 側で同 id の node が見えるまで poll、 座標一致を verify。
    // applyYnodeToGraph の root 経路 (PR #233) が動作しないとここで永久に
    // 来ない (= timeout で fail)、 regression detector として機能する。
    await expect
      .poll(async () => (await getNodeById(inviteePage, rectangle.id))?.x ?? null, {
        timeout: 15_000,
        intervals: [200, 500, 1000]
      })
      .toBe(rectangle.x)
  } finally {
    await inviteeContext.close()
  }
})
