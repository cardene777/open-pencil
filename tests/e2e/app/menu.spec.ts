import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

test('menu bar is visible in browser mode', async () => {
  const menubar = editor.page.locator('[role="menubar"]')
  await expect(menubar).toBeVisible()
})

test('menu bar has all top-level menus', async () => {
  const triggers = editor.page.locator('[role="menubar"] [role="menuitem"]')
  const labels = await triggers.allTextContents()
  expect(labels).toEqual(['File', 'Edit', 'View', 'Object', 'Text', 'Arrange'])
})

test('File menu opens and shows items', async () => {
  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'File' }).click()
  const menu = editor.page.locator('[role="menu"]')
  await expect(menu).toBeVisible()

  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => t.includes('Open'))).toBe(true)
  expect(items.some((t) => t.includes('Save'))).toBe(true)
  expect(items.some((t) => t.includes('Save As'))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

test('Edit menu shows Undo/Redo/Delete', async () => {
  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'Edit' }).click()
  const menu = editor.page.locator('[role="menu"]')
  await expect(menu).toBeVisible()

  // 日本語 default locale で訳されるため i18n regex で許容する。
  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => /Undo|元に戻す/.test(t))).toBe(true)
  expect(items.some((t) => /Redo|やり直し/.test(t))).toBe(true)
  expect(items.some((t) => /Delete|削除/.test(t))).toBe(true)
  expect(items.some((t) => /Select all|すべて選択/.test(t))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

test('View menu shows zoom options', async () => {
  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'View' }).click()
  const menu = editor.page.locator('[role="menu"]')
  await expect(menu).toBeVisible()

  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => /Zoom to fit|画面に合わせる/.test(t))).toBe(true)
  expect(items.some((t) => t.includes('Zoom In'))).toBe(true)
  expect(items.some((t) => t.includes('Zoom Out'))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

test('Object menu shows Group/Ungroup/Component', async () => {
  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'Object' }).click()
  const menu = editor.page.locator('[role="menu"]')
  await expect(menu).toBeVisible()

  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => /Group|グループ化/.test(t))).toBe(true)
  expect(items.some((t) => /Ungroup|グループ解除/.test(t))).toBe(true)
  expect(items.some((t) => /Create component|コンポーネントを作成/.test(t))).toBe(true)
  expect(items.some((t) => /Bring to front|最前面へ/.test(t))).toBe(true)
  expect(items.some((t) => /Send to back|最背面へ/.test(t))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

function getStoreStateNumber(key: 'selectedIds' | 'zoom') {
  return editor.page.evaluate((stateKey) => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store not initialized')
    if (stateKey === 'selectedIds') return store.state.selectedIds.size
    return store.state.zoom
  }, key)
}

test('Undo via Edit menu works', async () => {
  await editor.canvas.drawRect(200, 200, 100, 100)
  const beforeUndo = await getStoreStateNumber('selectedIds')
  expect(beforeUndo).toBe(1)

  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'Edit' }).click()
  // i18n 対応: 英語 "Undo" / 日本語 "元に戻す" のどちらでも click できる locator
  await editor.page.locator('[role="menu"] [role="menuitem"]', { hasText: /Undo|元に戻す/ }).click()
  await editor.canvas.waitForRender()

  const afterUndo = await getStoreStateNumber('selectedIds')
  expect(afterUndo).toBe(0)
})

test('Duplicate via Edit menu works', async () => {
  await editor.canvas.drawRect(300, 300, 80, 80)

  const countBefore = await editor.page.evaluate(() => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store not initialized')
    return store.graph.getChildren(store.state.currentPageId).length
  })

  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'Edit' }).click()
  await editor.page.locator('[role="menu"] [role="menuitem"]', { hasText: /Duplicate|複製/ }).click()
  await editor.canvas.waitForRender()

  const countAfter = await editor.page.evaluate(() => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store not initialized')
    return store.graph.getChildren(store.state.currentPageId).length
  })

  expect(countAfter).toBe(countBefore + 1)
})

test('Zoom to fit via View menu works', async () => {
  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'View' }).click()
  await editor.page.locator('[role="menu"] [role="menuitem"]', { hasText: 'Zoom In' }).click()
  await editor.canvas.waitForRender()

  const zoomBefore = await getStoreStateNumber('zoom')
  expect(zoomBefore).toBeGreaterThan(1)

  await editor.page.locator('[role="menubar"] [role="menuitem"]', { hasText: 'View' }).click()
  await editor.page.locator('[role="menu"] [role="menuitem"]', { hasText: /Zoom to fit|画面に合わせる/ }).click()
  await editor.canvas.waitForRender()

  const zoomAfter = await getStoreStateNumber('zoom')
  expect(zoomAfter).not.toBe(zoomBefore)
})
