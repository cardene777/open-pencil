import type { Page } from '@playwright/test'

import type { Board } from '@/app/api/client'
import type { NotificationRecord } from '@/app/api/notifications'

interface AuthSession {
  user: {
    id: string
    email: string
    name: string
    image: string | null
  }
}

export interface SeedNotificationsOptions {
  items: Array<
    | {
        type: 'invitation'
        read?: boolean
        payload: Extract<NotificationRecord, { type: 'invitation' }>['payload']
      }
    | {
        type: 'mention'
        read?: boolean
        payload: Extract<NotificationRecord, { type: 'mention' }>['payload']
      }
  >
}

export interface SeedInvitationOptions {
  email: string
  role?: 'editor' | 'viewer'
  expiresInMs?: number
}

async function readSession(page: Page): Promise<AuthSession | null> {
  const response = await page.request.get('/api/auth/session')
  if (response.status() === 401) return null
  if (!response.ok()) {
    throw new Error(`Failed to load auth session: ${response.status()} ${response.statusText()}`)
  }

  return (await response.json()) as AuthSession
}

async function setAnonymousId(page: Page, anonymousId: string) {
  await page.addInitScript((value) => {
    // oxlint-disable-next-line inkly/no-direct-storage-access
    window.localStorage.setItem('inkly.anonymous-id', value)
  }, anonymousId)

  if (page.url().startsWith('http://localhost:1420')) {
    await page.evaluate((value) => {
      // oxlint-disable-next-line inkly/no-direct-storage-access
      window.localStorage.setItem('inkly.anonymous-id', value)
    }, anonymousId)
  }
}

export async function cleanState(page: Page) {
  await page.context().clearCookies()
  const response = await page.request.post('/api/test/reset')
  if (!response.ok()) {
    throw new Error(`Failed to reset API state: ${response.status()} ${response.statusText()}`)
  }
}

export async function seedBoards(page: Page, count: number) {
  const session = await readSession(page)
  const anonymousId = session ? null : `visual-anon-${crypto.randomUUID()}`

  if (anonymousId) {
    await setAnonymousId(page, anonymousId)
  }

  const response = await page.request.post('/api/test/seed/boards', {
    data: {
      count,
      owner: session
        ? {
            kind: 'user',
            user: {
              id: session.user.id,
              email: session.user.email,
              name: session.user.name,
              image: session.user.image
            }
          }
        : {
            kind: 'anonymous',
            anonymousId
          }
    }
  })

  if (!response.ok()) {
    throw new Error(`Failed to seed boards: ${response.status()} ${response.statusText()}`)
  }

  const payload = (await response.json()) as { boards: Board[] }
  return payload.boards
}

export async function seedNotifications(page: Page, options: SeedNotificationsOptions) {
  const session = await readSession(page)
  if (!session) throw new Error('seedNotifications requires a signed-in user session')

  const response = await page.request.post('/api/test/seed/notifications', {
    data: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image
      },
      items: options.items
    }
  })

  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Failed to seed notifications: ${response.status()} ${response.statusText()} body=${body}`
    )
  }

  const payload = (await response.json()) as { notifications: NotificationRecord[] }
  return payload.notifications
}

export async function seedInvitations(
  page: Page,
  boardId: string,
  items: string[] | SeedInvitationOptions[]
) {
  const response = await page.request.post('/api/test/seed/invitations', {
    data: {
      boardId,
      items: items.map((item) =>
        typeof item === 'string'
          ? {
              email: item,
              role: 'editor'
            }
          : {
              email: item.email,
              role: item.role ?? 'editor',
              expiresInMs: item.expiresInMs
            }
      )
    }
  })

  if (!response.ok()) {
    throw new Error(`Failed to seed invitations: ${response.status()} ${response.statusText()}`)
  }

  const payload = (await response.json()) as {
    invitations: Array<{
      id: string
      token: string
      expiresAt: number
      role: 'editor' | 'viewer'
      createdAt: number
      revoked: boolean
      boardId: string
    }>
  }
  return payload.invitations
}

export async function readAnonymousId(page: Page) {
  if (!page.url().startsWith('http://localhost:1420')) return null
  return page.evaluate(() => {
    // oxlint-disable-next-line inkly/no-direct-storage-access
    return window.localStorage.getItem('inkly.anonymous-id')
  })
}

export async function clearAnonymousId(page: Page) {
  if (!page.url().startsWith('http://localhost:1420')) return
  await page.evaluate(() => {
    // oxlint-disable-next-line inkly/no-direct-storage-access
    window.localStorage.removeItem('inkly.anonymous-id')
  })
}
