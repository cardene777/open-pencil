import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'

/**
 * Avatar Stack の dedup 検証 e2e。
 *
 * Issue #225 / #232 / PR #226 / #231 / #233 で対応した「同一 user が複数 tab を
 * 開いても Avatar Stack に 1 件のみ表示される」を、 実際の Playwright マルチ
 * BrowserContext で再現検証する。
 *
 * 想定 scenario ...
 *   1. 同一 user (sign-in 済) で 3 つの BrowserContext (= 3 tab 相当) を開く
 *   2. すべて同じ board に接続して collab room に参加する
 *   3. 各 context から Avatar Stack を覗き、 「自分以外の peer avatar 数」が
 *      ちょうど 2 件 (= 他 2 tab) 表示されることを確認する
 *      (誤って 4 件以上 = dedup できていない症状の regression detection)
 *   4. cleanup ... 全 context を close
 *
 * 注意 ...
 *   - 同一 user の userId が awareness に乗り、 真の dedup (`buildRemotePeers`
 *     の userId 経路) が成立しているかが核心。
 *   - color や name は user identity 由来で全 context 同じになるため、
 *     name+color fallback でも dedup されるが、 userId が欠落していると
 *     fallback すら効かない race window がある。 そこを catch するのが本 test。
 */
test('同一 user が 3 tab を開いても Avatar Stack に 1 件のみ表示 (Issue #232 regression detector)', async ({
  browser,
  page
}) => {
  const boardName = `Avatar Dedup ${Date.now()}`
  const userEmail = `dedup-user-${Date.now()}@jfet.co.jp`
  const userName = 'Dedup User'

  // tab 1 ... owner として board 作成。
  await mockGoogleLogin(page, { email: userEmail, name: userName })
  await page.goto('/boards')
  await page.getByTestId('board-name-input').fill(boardName)
  await page.getByTestId('board-create-button').click()
  await page.waitForURL(/\/board\//, { timeout: 15_000 })
  await expect(page.getByTestId('editor-root')).toBeVisible()

  const boardUrl = page.url()

  const canvas1 = new CanvasHelper(page)
  await canvas1.waitForInit()

  // tab 2 / tab 3 ... 同一 user 別 context で同じ board に join。
  const extraContexts: BrowserContext[] = []
  const extraPages: Page[] = []
  try {
    for (let i = 0; i < 2; i += 1) {
      const ctx = await browser.newContext()
      extraContexts.push(ctx)
      const tab = await ctx.newPage()
      extraPages.push(tab)
      await mockGoogleLogin(tab, { email: userEmail, name: userName })
      await tab.goto(boardUrl)
      await expect(tab.getByTestId('editor-root')).toBeVisible()
      const canvas = new CanvasHelper(tab)
      await canvas.waitForInit()
    }

    // 3 tab 全てが collab room に join するまで少し待つ。
    // peer presence 反映は awareness の network round-trip に依存するため
    // 短い polling timeout で wait する。
    const pollPeerCount = async (target: Page) => {
      // local avatar (collab-local-avatar) は除外、 peer avatar だけ数える。
      const count = await target.locator('[data-test-id="collab-peer-avatar"]').count()
      return count
    }

    // tab 1 から他 2 tab を peer として観測 ... dedup 効いていれば 2 件、 効いて
    // いなければ 4 件以上 (clientId 別で重複表示)。
    await expect
      .poll(() => pollPeerCount(page), {
        timeout: 15_000,
        intervals: [200, 500, 1000]
      })
      .toBe(2)

    // tab 2 視点でも 2 件 (= tab 1 と tab 3)。
    await expect
      .poll(() => pollPeerCount(extraPages[0]), {
        timeout: 15_000,
        intervals: [200, 500, 1000]
      })
      .toBe(2)

    // tab 3 視点でも 2 件 (= tab 1 と tab 2)。
    await expect
      .poll(() => pollPeerCount(extraPages[1]), {
        timeout: 15_000,
        intervals: [200, 500, 1000]
      })
      .toBe(2)
  } finally {
    for (const tab of extraPages) await tab.close().catch(() => undefined)
    for (const ctx of extraContexts) await ctx.close().catch(() => undefined)
  }
})
