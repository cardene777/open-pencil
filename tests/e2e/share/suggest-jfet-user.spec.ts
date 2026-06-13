import { expect, test, type Browser, type Page } from '@playwright/test'

import { cleanState } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { expectToast } from '#tests/helpers/interaction'

async function provisionJfetUser(
  browser: Browser,
  email: string,
  name: string
): Promise<{ userId: string }> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await mockGoogleLogin(page, { email, name })
  const sessionResponse = await page.request.get('/api/auth/session')
  const session = (await sessionResponse.json()) as { user: { id: string } }
  await context.close()
  return { userId: session.user.id }
}

async function createBoardAndOpenShare(page: Page, boardName: string) {
  await page.goto('/boards')
  await page.getByTestId('boards-locale-switcher').selectOption('en')
  await page.getByTestId('board-name-input').fill(boardName)
  await page.getByTestId('board-create-button').click()
  await page.waitForURL(/\/board\//, { timeout: 15_000 })

  const url = new URL(page.url())
  const boardId = url.pathname.split('/').at(-1) ?? ''
  if (!boardId) throw new Error('Failed to resolve board id from URL')

  await page.goto(`/board/${boardId}/settings`)
  await expect(page.getByTestId('board-settings-view')).toBeVisible()
  await page.getByTestId('board-settings-share-button').click()
  await expect(page.getByTestId('share-modal')).toBeVisible()

  return { boardId }
}

test.describe('jfet share suggest ui', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  test('query input shows internal user suggestions', async ({ browser, page }) => {
    const ownerEmail = `owner-suggest-${Date.now()}@jfet.co.jp`
    const alice = await provisionJfetUser(browser, `alice-${Date.now()}@jfet.co.jp`, 'Alice Smith')
    const alex = await provisionJfetUser(browser, `alex-${Date.now()}@jfet.co.jp`, 'Alex Jones')

    await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner User' })
    await createBoardAndOpenShare(page, `Suggest Board ${Date.now()}`)

    await page.getByTestId('share-recipients-input').fill('al')

    await expect(page.getByTestId(`share-recipient-suggest-${alice.userId}`)).toBeVisible()
    await expect(page.getByTestId(`share-recipient-suggest-${alex.userId}`)).toBeVisible()
  })

  test('selecting a suggestion creates a chip and submit adds collaborator', async ({
    browser,
    page
  }) => {
    const ownerEmail = `owner-select-${Date.now()}@jfet.co.jp`
    const candidateEmail = `alice-select-${Date.now()}@jfet.co.jp`
    const candidate = await provisionJfetUser(browser, candidateEmail, 'Alice Select')

    await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner User' })
    await createBoardAndOpenShare(page, `Select Board ${Date.now()}`)

    await page.getByTestId('share-recipients-input').fill('alice')
    await page.getByTestId(`share-recipient-suggest-${candidate.userId}`).click()

    await expect(page.getByTestId('share-recipient-chip-0')).toContainText(candidateEmail)

    await page.getByTestId('share-submit').click()
    await expectToast(page, '1 added directly to the board.')
  })

  test('existing collaborators are excluded from suggestions', async ({ browser, page }) => {
    const ownerEmail = `owner-exclude-${Date.now()}@jfet.co.jp`
    const collaboratorEmail = `alex-collab-${Date.now()}@jfet.co.jp`
    const visibleEmail = `alice-visible-${Date.now()}@jfet.co.jp`
    const collaborator = await provisionJfetUser(browser, collaboratorEmail, 'Alex Collaborator')
    const visibleUser = await provisionJfetUser(browser, visibleEmail, 'Alice Visible')

    await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner User' })
    const { boardId } = await createBoardAndOpenShare(page, `Exclude Board ${Date.now()}`)

    await page.getByTestId('share-recipients-input').fill(collaboratorEmail)
    await page.getByTestId('share-recipients-input').press(' ')
    await page.getByTestId('share-submit').click()
    await expectToast(page, '1 added directly to the board.')

    await page.goto(`/board/${boardId}/settings`)
    await page.getByTestId('board-settings-share-button').click()
    await expect(page.getByTestId('share-modal')).toBeVisible()

    await page.getByTestId('share-recipients-input').fill('a')

    await expect(
      page.getByTestId(`share-recipient-suggest-${visibleUser.userId}`)
    ).toBeVisible()
    await expect(
      page.getByTestId(`share-recipient-suggest-${collaborator.userId}`)
    ).toHaveCount(0)
  })
})
