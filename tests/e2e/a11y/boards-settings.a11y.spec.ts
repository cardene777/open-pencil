import { expect, test } from '@playwright/test'

import { runA11yScan, expectNoCriticalViolations } from '#tests/helpers/a11y'
import { cleanState, seedBoards, seedInvitations } from '#tests/helpers/api-seed'
import { mockGoogleLogin } from '#tests/helpers/e2e-auth'
import { waitForVisualReady } from '#tests/helpers/visual'

const boardSettingsDisabledRules = [
  // TODO(cardene): `color-contrast` in board settings is tracked for a follow-up a11y fix PR.
  'color-contrast'
]

test.describe('board settings accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await cleanState(page)
    // PR #141 で /boards / /board/:id/settings は auth 必須化された。
    // seedBoards / seedInvitations を成立させるため beforeEach で login する。
    await mockGoogleLogin(page, {
      email: 'board-settings-a11y@jfet.co.jp',
      name: 'Board Settings A11y'
    })
  })

  test('empty invitation state has no critical accessibility violations', async ({ page }) => {
    const [board] = await seedBoards(page, 1)

    await page.goto(`/board/${board.id}/settings`)
    await expect(page.getByTestId('board-invitation-list')).toBeVisible()
    await waitForVisualReady(page)

    const results = await runA11yScan(page, {
      disableRules: boardSettingsDisabledRules
    })
    expectNoCriticalViolations(results)
  })

  test('populated invitation state has no critical accessibility violations', async ({ page }) => {
    const [board] = await seedBoards(page, 1)

    await seedInvitations(page, board.id, [
      'board-a11y-first@jfet.co.jp',
      'board-a11y-second@jfet.co.jp'
    ])
    await page.goto(`/board/${board.id}/settings`)
    await expect(page.getByTestId('board-revoke-invitation')).toHaveCount(2)
    await waitForVisualReady(page)

    const results = await runA11yScan(page, {
      disableRules: boardSettingsDisabledRules
    })
    expectNoCriticalViolations(results)
  })

  test('revoke dialog has no critical accessibility violations', async ({ page }) => {
    const [board] = await seedBoards(page, 1)

    await seedInvitations(page, board.id, ['board-a11y-revoke@jfet.co.jp'])
    await page.goto(`/board/${board.id}/settings`)
    await page.getByTestId('board-revoke-invitation').first().click()
    await expect(page.getByTestId('board-revoke-dialog')).toBeVisible()
    await waitForVisualReady(page)

    const results = await runA11yScan(page, {
      disableRules: boardSettingsDisabledRules
    })
    expectNoCriticalViolations(results)
  })
})
