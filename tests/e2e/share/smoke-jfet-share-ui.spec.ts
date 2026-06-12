import { expect, test, type Browser, type Page } from '@playwright/test'

import { cleanState } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { expectToast } from '#tests/helpers/interaction'

async function provisionJfetUser(browser: Browser, email: string, name: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await mockGoogleLogin(page, { email, name })
  await context.close()
}

async function createBoardAndOpenShare(page: Page, boardName: string) {
  await page.goto('/boards')
  await page.getByTestId('boards-locale-switcher').selectOption('en')
  await page.getByTestId('board-name-input').fill(boardName)
  await page.getByTestId('board-create-button').click()
  await page.waitForURL(/\/board\//, { timeout: 15_000 })
  await expect(page.getByTestId('editor-root')).toBeVisible()
  await page.getByTestId('invite-share-button').click()
  await expect(page.getByTestId('share-modal')).toBeVisible()
}

async function shareWithInternalAndExternal(
  page: Page,
  input: {
    externalEmail: string
    internalEmails: string[]
  }
) {
  await page
    .getByTestId('share-internal-emails-input')
    .fill(input.internalEmails.join('\n'))
  await page.getByTestId('share-email-input').fill(input.externalEmail)
  await page.getByTestId('share-submit').click()
}

test.describe('jfet share ui smoke', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
  })

  test('multi-select share reports added, pending, and rejected results', async ({
    browser,
    page
  }) => {
    const ownerEmail = `owner-${Date.now()}@jfet.co.jp`
    const existingEmail = `existing-${Date.now()}@jfet.co.jp`
    const pendingEmail = `pending-${Date.now()}@jfet.co.jp`
    const rejectedEmail = `rejected-${Date.now()}@external.test`
    const externalInviteEmail = `invite-${Date.now()}@external.test`
    const boardName = `Share Smoke ${Date.now()}`

    await provisionJfetUser(browser, existingEmail, 'Existing Collaborator')
    await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner User' })
    await createBoardAndOpenShare(page, boardName)

    await shareWithInternalAndExternal(page, {
      internalEmails: [existingEmail, pendingEmail, rejectedEmail],
      externalEmail: externalInviteEmail
    })

    await expectToast(page, '1 added directly to the board.')
    await expectToast(page, '1 pending — they will join after first sign-in.')
    await expectToast(page, '1 external addresses — use the invitation link instead.')

    const invitationUrl = (await page.getByTestId('share-link-output').textContent())?.trim() ?? ''
    expect(invitationUrl).toMatch(/^http:\/\/localhost:1420\/invite\//)
  })

  test('collaborators do not see board delete controls in the board list', async ({
    browser,
    page
  }) => {
    const ownerEmail = `owner-delete-${Date.now()}@jfet.co.jp`
    const collaboratorEmail = `collab-delete-${Date.now()}@jfet.co.jp`
    const boardName = `Delete Guard ${Date.now()}`

    await provisionJfetUser(browser, collaboratorEmail, 'Collaborator User')
    await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner User' })
    await createBoardAndOpenShare(page, boardName)

    await shareWithInternalAndExternal(page, {
      internalEmails: [collaboratorEmail],
      externalEmail: ''
    })
    await expectToast(page, '1 added directly to the board.')

    const collaboratorContext = await browser.newContext()
    const collaboratorPage = await collaboratorContext.newPage()
    await mockGoogleLogin(collaboratorPage, {
      email: collaboratorEmail,
      name: 'Collaborator User'
    })
    await collaboratorPage.goto('/boards')
    await collaboratorPage.getByTestId('boards-locale-switcher').selectOption('en')

    const card = collaboratorPage.getByTestId('board-card').filter({ hasText: boardName })
    await expect(card).toHaveCount(1)
    await expect(card.getByTestId('board-delete')).toHaveCount(0)

    await collaboratorContext.close()
  })

  test('dashboard marks invited boards with the invited badge', async ({ browser, page }) => {
    const ownerEmail = `owner-badge-${Date.now()}@jfet.co.jp`
    const collaboratorEmail = `collab-badge-${Date.now()}@jfet.co.jp`
    const boardName = `Badge Board ${Date.now()}`

    await provisionJfetUser(browser, collaboratorEmail, 'Dashboard Collaborator')
    await mockGoogleLogin(page, { email: ownerEmail, name: 'Owner User' })
    await createBoardAndOpenShare(page, boardName)

    await shareWithInternalAndExternal(page, {
      internalEmails: [collaboratorEmail],
      externalEmail: ''
    })
    await expectToast(page, '1 added directly to the board.')

    const collaboratorContext = await browser.newContext()
    const collaboratorPage = await collaboratorContext.newPage()
    await mockGoogleLogin(collaboratorPage, {
      email: collaboratorEmail,
      name: 'Dashboard Collaborator'
    })
    await collaboratorPage.goto('/dashboard')
    await collaboratorPage.getByTestId('dashboard-locale-switcher').selectOption('en')

    const card = collaboratorPage.getByTestId('dashboard-board').filter({ hasText: boardName })
    await expect(card).toHaveCount(1)
    await expect(card.getByText('Invited')).toBeVisible()

    await collaboratorContext.close()
  })
})
