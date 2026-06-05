import { Hono } from 'hono'

import { getAuthSession, type InklyAuth } from '../auth/index.js'
import type { NotificationStore } from '../types.js'

export interface NotificationRoutesOptions {
  auth: InklyAuth
  notificationStore: NotificationStore
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message
      }
    },
    { status }
  )
}

export function createNotificationRoutes(options: NotificationRoutesOptions): Hono {
  const app = new Hono()

  app.get('/notifications', async (c) => {
    const session = await getAuthSession(options.auth, c.req.raw)
    if (!session) return errorResponse(401, 'unauthorized', 'Login required')

    return c.json({
      notifications: options.notificationStore.listNotificationsForUser(session.user.id)
    })
  })

  app.post('/notifications/:id/read', async (c) => {
    const session = await getAuthSession(options.auth, c.req.raw)
    if (!session) return errorResponse(401, 'unauthorized', 'Login required')

    const notification = options.notificationStore.markNotificationRead(
      c.req.param('id'),
      session.user.id
    )
    if (!notification) {
      return errorResponse(404, 'notification_not_found', 'Notification not found')
    }

    return c.json({ notification })
  })

  app.post('/notifications/read-all', async (c) => {
    const session = await getAuthSession(options.auth, c.req.raw)
    if (!session) return errorResponse(401, 'unauthorized', 'Login required')

    return c.json({
      updatedCount: options.notificationStore.markAllNotificationsRead(session.user.id)
    })
  })

  app.delete('/notifications/:id', async (c) => {
    const session = await getAuthSession(options.auth, c.req.raw)
    if (!session) return errorResponse(401, 'unauthorized', 'Login required')

    const notification = options.notificationStore.deleteNotification(
      c.req.param('id'),
      session.user.id
    )
    if (!notification) {
      return errorResponse(404, 'notification_not_found', 'Notification not found')
    }

    return c.json({ deleted: true, notification })
  })

  return app
}
