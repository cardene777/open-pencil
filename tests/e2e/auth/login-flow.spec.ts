import { expect, test, type Page } from '@playwright/test'

function parseCookie(cookieHeader: string) {
  const [nameValue, ...attributes] = cookieHeader.split(';').map((part) => part.trim())
  const [name, ...valueParts] = nameValue.split('=')
  const value = valueParts.join('=')

  let domain = 'localhost'
  let path = '/'
  let expires: number | undefined
  let httpOnly = false
  let secure = false
  let sameSite: 'Lax' | 'Strict' | 'None' = 'Lax'

  for (const attribute of attributes) {
    const [rawKey, ...rawValueParts] = attribute.split('=')
    const key = rawKey.toLowerCase()
    const attributeValue = rawValueParts.join('=')

    if (key === 'domain' && attributeValue) domain = attributeValue
    if (key === 'path' && attributeValue) path = attributeValue
    if (key === 'expires' && attributeValue) {
      expires = Math.floor(new Date(attributeValue).getTime() / 1000)
    }
    if (key === 'httponly') httpOnly = true
    if (key === 'secure') secure = true
    if (
      key === 'samesite' &&
      (attributeValue === 'Lax' || attributeValue === 'Strict' || attributeValue === 'None')
    ) {
      sameSite = attributeValue
    }
  }

  return {
    name,
    value,
    domain,
    path,
    expires,
    httpOnly,
    secure,
    sameSite
  } as const
}

async function mockGoogleLogin(page: Page) {
  const response = await page.request.post('/api/auth/test/login', {
    data: {
      email: 'playwright-user@inkly.test',
      name: 'Playwright User'
    }
  })

  expect(response.ok()).toBeTruthy()

  const cookieHeader = response
    .headersArray()
    .find((header) => header.name.toLowerCase() === 'set-cookie')?.value

  expect(cookieHeader).toBeTruthy()
  const cookie = parseCookie(cookieHeader ?? '')
  await page.context().addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      url: 'http://localhost:1420',
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite
    }
  ])
}

test('anonymous boards migrate into the signed-in account after login', async ({ page }) => {
  const boardName = `Migrated ${Date.now()}`

  await page.goto('/boards')
  await expect(page.getByTestId('boards-view')).toBeVisible()
  await expect(page.getByTestId('login-banner')).toBeVisible()

  await page.getByTestId('board-create-input').fill(boardName)
  await page.getByTestId('board-create-button').click()

  await expect(page.getByTestId('editor-root')).toBeVisible()
  await page.goBack()
  await expect(page.getByText(boardName)).toBeVisible()

  await page.goto('/account')
  await expect(page.getByTestId('account-view')).toBeVisible()
  await expect(page.getByTestId('account-login-button')).toBeVisible()
  await mockGoogleLogin(page)
  await page.reload()

  await expect(page.getByTestId('account-profile')).toBeVisible()
  await expect(page.getByTestId('account-email')).toContainText('playwright-user@inkly.test')

  await page.goto('/boards')
  await expect(page.getByTestId('boards-account-link')).toBeVisible()
  await expect(page.getByTestId('login-banner')).toHaveCount(0)
  await expect(page.getByText(boardName)).toBeVisible()

  const anonymousId = await page.evaluate(() => window.localStorage.getItem('inkly.anonymous-id'))
  expect(anonymousId).toBeNull()

  await page.reload()
  await expect(page.getByText(boardName)).toBeVisible()
})
