import { expect, test, type Page } from '@playwright/test'

import { cleanState } from '#tests/helpers/api-seed'
import { CanvasHelper } from '#tests/helpers/canvas'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'

async function createBoard(page: Page, boardName: string) {
  await page.goto('/boards')
  await page.getByTestId('boards-locale-switcher').selectOption('en')
  await page.getByTestId('board-name-input').fill(boardName)
  await page.getByTestId('board-create-button').click()
  await page.waitForURL(/\/board\//, { timeout: 15_000 })
}

async function pickOptionByIndex(page: Page, triggerTestId: string, index: number) {
  await page.getByTestId(triggerTestId).click()
  for (let i = 0; i < index; i += 1) {
    await page.keyboard.press('ArrowDown')
  }
  await page.keyboard.press('Enter')
  // Reka-ui Select can leave a portal layer; explicit Escape closes any residual popover.
  await page.keyboard.press('Escape')
  // Allow the portal to fully unmount before the next interaction.
  await page.waitForTimeout(200)
}

async function seedPrototypeFrames(page: Page) {
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.selectTool('frame')
  await canvas.drag(80, 80, 360, 300)
  await canvas.drag(420, 80, 700, 300)
  await canvas.waitForRender()
  return canvas
}

test.describe('prototype flow', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
    await mockGoogleLogin(page, {
      email: `prototype-${Date.now()}@jfet.co.jp`,
      name: 'Prototype User'
    })
  })

  test('reactions can be authored against the selected frame', async ({ page }) => {
    await createBoard(page, `Prototype Authoring ${Date.now()}`)
    const canvas = await seedPrototypeFrames(page)

    await canvas.click(120, 120)
    await page.getByTestId('prototype-add-reaction').click()

    await expect(page.getByTestId('prototype-reaction')).toHaveCount(1)

    await pickOptionByIndex(page, 'prototype-target-frame-0', 2)
    await expect(page.getByTestId('prototype-reaction')).toHaveCount(1)
  })

  test('play mode opens the preview surface', async ({ page }) => {
    await createBoard(page, `Prototype Preview ${Date.now()}`)
    await seedPrototypeFrames(page)

    await page.getByTestId('editor-play-button').click()
    await page.waitForURL(/\/preview/, { timeout: 15_000 })
    await expect(page.getByTestId('preview-view')).toBeVisible()
  })

  test('site export option is available in the export panel', async ({ page }) => {
    await createBoard(page, `Prototype Export ${Date.now()}`)
    await seedPrototypeFrames(page)

    const formatTrigger = page
      .getByTestId('export-item')
      .first()
      .getByTestId('app-select-trigger')
      .last()
    await formatTrigger.click()

    await expect(page.getByRole('option', { name: /Site ZIP/i }).first()).toBeVisible()
  })
})
