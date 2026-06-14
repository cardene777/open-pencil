import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { seedInternalUsers } from '#tests/helpers/api-seed'
import { getNodeById, getPageChildren } from '#tests/helpers/store'

/**
 * 異 user owner / invitee の realtime sync regression detector (Issue #232 / PR #233)。
 * 同一 user 2 context の既存 realtime-sync.spec.ts では ACL / applyYnodeToGraph root
 * 経路が verify できないため、 invitee を internalUsers に seed して
 * immediate collaborator 化したうえで rectangle の双方向反映を観測する。
 */
test('owner が rectangle 描画すると invitee 側で同 node が見える (Issue #232 cross-user regression detector)', async ({
  browser,
  page
}) => {
  // poll が 15s × 1 + canvas init / share API / login 2 回で 30s 標準を超えるため余裕を持って 60s。
  test.setTimeout(60_000)

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

    // invitee 側で同 node が見えるまで poll、 形状全体 (type / 座標 / size) の
    // 一致を verify。 applyYnodeToGraph の root 経路 (PR #233) が動作しないと
    // ここで永久に来ない (= timeout で fail)、 regression detector として機能する。
    await expect
      .poll(
        async () => {
          const inviteeNode = await getNodeById(inviteePage, rectangle.id)
          if (!inviteeNode) return null
          return {
            type: inviteeNode.type,
            x: inviteeNode.x,
            y: inviteeNode.y,
            width: inviteeNode.width,
            height: inviteeNode.height
          }
        },
        {
          timeout: 15_000,
          intervals: [200, 500, 1000]
        }
      )
      .toEqual({
        type: rectangle.type,
        x: rectangle.x,
        y: rectangle.y,
        width: rectangle.width,
        height: rectangle.height
      })
  } finally {
    await inviteeContext.close()
  }
})
