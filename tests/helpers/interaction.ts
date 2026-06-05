import { expect, type Locator, type Page } from '@playwright/test'

function toResponseMatcher(urlPattern: RegExp | string) {
  return (url: string) =>
    typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url)
}

export async function expectToast(
  page: Page,
  message: string,
  options: { timeout?: number } = {}
) {
  const toast = page.getByTestId('toast').filter({ hasText: message }).first()
  await expect(toast).toBeVisible({ timeout: options.timeout })
  await expect(toast).toContainText(message)
}

export async function expectModal(
  page: Page,
  testId: string,
  options: { open: boolean }
) {
  const modal = page.getByTestId(testId)
  if (options.open) {
    await expect(modal).toBeVisible()
    return
  }

  await expect(modal).toHaveCount(0)
}

export async function expectClipboard(page: Page, expected: string) {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  const value = await page.evaluate(() => navigator.clipboard.readText())
  expect(value).toBe(expected)
}

export async function clickAndWaitForResponse<T>(
  page: Page,
  locator: Locator,
  urlPattern: RegExp | string
) {
  const matches = toResponseMatcher(urlPattern)
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => matches(candidate.url()) && candidate.ok()),
    locator.click()
  ])

  return (await response.json()) as T
}

export async function expectHoverStyle(
  locator: Locator,
  expected: {
    backgroundColor?: string
    color?: string
  }
) {
  await locator.hover()
  const styles = await locator.evaluate((element) => {
    const computed = window.getComputedStyle(element)
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color
    }
  })

  if (expected.backgroundColor) {
    expect(styles.backgroundColor).toBe(expected.backgroundColor)
  }
  if (expected.color) {
    expect(styles.color).toBe(expected.color)
  }
}
