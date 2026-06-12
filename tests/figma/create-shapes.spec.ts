import { test, expect } from '@playwright/test'

import { FigmaHelper } from '#tests/helpers/figma'

test.describe('figma reference: create shapes', () => {
  let figma: FigmaHelper
  let figmaAvailable = false

  test.beforeAll(async () => {
    figma = new FigmaHelper()
    // Figma desktop app の CDP port (9222) が開いていない環境では skip 扱い。
    // CI / 通常 dev では Figma app を起動しないため、 接続失敗で全 test skip する。
    try {
      await figma.connect()
      figmaAvailable = true
    } catch (error) {
      console.warn('[figma] CDP connect failed, skipping all figma reference specs:', error)
    }
  })

  test.afterAll(async () => {
    if (figmaAvailable) await figma.disconnect()
  })

  test.beforeEach(async () => {
    if (!figmaAvailable) test.skip(true, 'Figma desktop app not running on CDP port 9222')
    await figma.deleteSelection()
    await figma.waitForRender()
  })

  test('empty canvas', async () => {
    await expect(figma.canvas).toHaveScreenshot()
  })

  test('draw rectangle', async () => {
    await figma.drawRect(200, 200, 200, 150)
    await expect(figma.canvas).toHaveScreenshot()
  })
})
