// Inkly e2e UI flow template
// 使い方:
//   1. tests/e2e/{category}/{name}.spec.ts に copy
//   2. spec 名 / 操作 / assertion を書き換え
//   3. inkly-e2e skill §3 の再現性チェックリストを self-check

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear()

test.describe('FIXME spec 名', () => {
  test('FIXME 操作と期待動作', async () => {
    test.setTimeout(60_000)

    // 1. 準備 — fixture が clean state を保証 (useEditorSetupWithClear)

    // 2. 操作 — CanvasHelper メソッドを使う
    await editor.canvas.drawRect(100, 100, 200, 150)
    await editor.canvas.waitForRender()

    // 3. assertion — store 状態 / DOM / screenshot
    const nodeCount = await editor.page.evaluate(() => {
      const store = window.inkly?.getStore?.()
      const pageId = store?.state.currentPageId
      if (!store || !pageId) return 0
      return store.graph.getNode(pageId)?.childIds.length ?? 0
    })
    expect(nodeCount).toBe(1)

    // 4. error 検出
    editor.canvas.assertNoErrors()
  })
})
