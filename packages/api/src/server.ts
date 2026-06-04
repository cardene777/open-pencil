import { Hono } from 'hono'

import { createBoardStore } from './boardStore.js'
import { resolveApiDatabaseOptions, type ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { createResendEmailSender, type InvitationEmailSender } from './email/resend.js'
import { createBoardRoutes } from './routes/boards.js'
import { createInviteRoutes } from './routes/invite.js'
import { createInvitationStore } from './store.js'
import { requireJwtSecret } from './token.js'
import type { BoardStore, InvitationStore } from './types.js'
import { createSignalingServer } from './ws/signaling.js'

export const API_HOST = '127.0.0.1'
export const API_PORT = 3001

export interface CreateApiAppOptions {
  secret: string
  store?: InvitationStore
  boardStore?: BoardStore
  database?: ApiDatabase
  emailSender?: InvitationEmailSender
  env?: NodeJS.ProcessEnv
  now?: () => number
}

export interface StartApiServerOptions extends CreateApiAppOptions {
  port?: number
  host?: string
}

export function createApiApp(options: CreateApiAppOptions) {
  const database =
    options.database ??
    (options.store && options.boardStore
      ? null
      : createMigratedApiDatabase(resolveApiDatabaseOptions(options.env)))
  const store = options.store ?? createInvitationStore({ database: database ?? undefined, now: options.now })
  const boardStore =
    options.boardStore ?? createBoardStore({ database: database ?? undefined, now: options.now })
  const emailSender =
    options.emailSender ??
    createResendEmailSender({
      apiKey: options.env?.INKLY_API_RESEND_KEY,
      logger: console.log
    })
  const app = new Hono()

  app.onError((error, c) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
    process.stderr.write(`[inkly-api] ${message}\n`)
    return c.json(
      {
        error: {
          code: 'internal_error',
          message: 'Internal server error'
        }
      },
      500
    )
  })

  app.route(
    '/api',
    createInviteRoutes({
      secret: options.secret,
      store,
      boardStore,
      emailSender,
      now: options.now
    })
  )

  app.route(
    '/api',
    createBoardRoutes({
      boardStore,
      invitationStore: store
    })
  )

  return { app, store, boardStore, database, emailSender }
}

export function startApiServer(options: Partial<StartApiServerOptions> = {}) {
  const secret = options.secret ?? requireJwtSecret()
  const port = options.port ?? API_PORT
  const host = options.host ?? API_HOST
  const { app, store, boardStore, database, emailSender } = createApiApp({
    boardStore: options.boardStore,
    database: options.database,
    emailSender: options.emailSender,
    env: options.env,
    secret,
    store: options.store,
    now: options.now
  })
  const signaling = createSignalingServer()

  const server = Bun.serve({
    hostname: host,
    port,
    fetch(request, server) {
      const signalingResponse = signaling.handleRequest(request, server)
      if (signalingResponse !== null) return signalingResponse
      return app.fetch(request)
    },
    websocket: signaling.websocket
  })

  process.stderr.write(`Inkly API server listening on http://${host}:${port}\n`)

  return { app, store, boardStore, database, emailSender, server, port, host }
}

if (import.meta.main) {
  try {
    startApiServer()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[inkly-api] ${message}\n`)
    process.exit(1)
  }
}
