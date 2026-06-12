import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('font settings popover exposes web font access without desktop-only cache actions', async ({
  page
}) => {
  await page.goto('/editor')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.evaluate(() => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store not initialized')
    const id = store.createShape('TEXT', 120, 120, 240, 40)
    store.updateNode(id, { characters: 'Font settings smoke' })
    store.select([id])
  })

  await expect(page.getByTestId('typography-section')).toBeVisible()
  await page.getByTestId('font-settings-trigger').click()

  // i18n: 英語 / 日本語のどちらでも表示される文言
  await expect(
    page.getByText(/Allow browser access to local fonts|ブラウザによるローカルフォントアクセスを許可/)
  ).toBeVisible()
  await expect(page.getByTestId('font-settings-request-access')).toBeVisible()
  await expect(page.getByTestId('font-settings-toggle-google-fonts')).toHaveText(/Disable|無効化/)
  await page.getByTestId('font-settings-toggle-google-fonts').click()
  await expect(page.getByTestId('font-settings-toggle-google-fonts')).toHaveText(/Enable|有効化/)
  await page.getByTestId('font-settings-toggle-google-fonts').click()
  await expect(page.getByTestId('font-settings-toggle-google-fonts')).toHaveText(/Disable|無効化/)
  await expect(page.getByTestId('font-settings-download-fallbacks')).toHaveCount(0)
  await expect(page.getByTestId('font-settings-refresh-cache')).toHaveCount(0)
  await expect(page.getByTestId('font-settings-clear-cache')).toHaveCount(0)
  await expect(
    page.getByText(/Download CJK and Arabic fallbacks|CJK と Arabic のフォールバック/)
  ).toHaveCount(0)
})
