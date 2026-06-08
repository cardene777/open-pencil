import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

import { INKLY_ANONYMOUS_ID_HEADER } from '../anonymousId.js'
import { getAuthSession, type InklyAuth } from '../auth/index.js'
import { invitations } from '../db/schema.js'
import { migrateAnonymousOwnership } from '../auth/migrate.js'
import type { ApiDatabase } from '../db/client.js'
import { hashInvitationEmail, verifyInvitationToken } from '../token.js'

const testLoginSchema = z.object({
  email: z.string().trim().email().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  image: z.string().trim().url().nullable().optional()
})

const testLoginRedirectSchema = testLoginSchema.extend({
  callbackURL: z.string().trim().min(1).optional()
})

export interface AuthRoutesOptions {
  auth: InklyAuth
  database: ApiDatabase
  now?: () => number
  secret: string
}

const emailSignUpSchema = z.object({
  email: z.string().trim().email(),
  invitationToken: z.string().trim().min(1).optional(),
  inviteToken: z.string().trim().min(1).optional()
})

function resolveInvitationToken(
  body: z.infer<typeof emailSignUpSchema>,
  requestUrl: string
) {
  const query = new URL(requestUrl).searchParams

  return (
    body.invitationToken ??
    body.inviteToken ??
    query.get('invitationToken')?.trim() ??
    query.get('inviteToken')?.trim() ??
    ''
  )
}

function unauthorizedResponse(headers?: HeadersInit) {
  return new Response(
    JSON.stringify({
      error: {
        code: 'unauthorized',
        message: 'No active session'
      }
    }),
    {
      status: 401,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        ...headers
      }
    }
  )
}

async function proxySession(auth: InklyAuth, request: Request): Promise<Response> {
  const session = await getAuthSession(auth, request)
  if (session) {
    return Response.json(session)
  }

  return unauthorizedResponse()
}

function appendSetCookieHeaders(headers: Headers, values: string[]) {
  for (const value of values) {
    headers.append('set-cookie', value)
  }
}

function notFoundTestLoginResponse() {
  return Response.json(
    {
      error: {
        code: 'not_found',
        message: 'Test login is not enabled'
      }
    },
    { status: 404 }
  )
}

export function createAuthRoutes(options: AuthRoutesOptions): Hono {
  const app = new Hono()
  const now = options.now ?? Date.now

  app.get('/session', (c) => proxySession(options.auth, c.req.raw))

  app.post('/sign-up/email', async (c) => {
    const rawBody = await c.req.raw.text()
    let body: unknown = {}

    if (rawBody) {
      try {
        body = JSON.parse(rawBody) as unknown
      } catch {
        body = null
      }
    }

    const parsed = emailSignUpSchema.safeParse(body)

    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(
        {
          error: {
            code: 'invalid_request_body',
            message: issue
          }
        },
        400
      )
    }

    const invitationToken = resolveInvitationToken(parsed.data, c.req.url)

    if (!invitationToken) {
      return c.json(
        {
          error: {
            code: 'missing_invitation_token',
            message: 'Invitation token is required for email sign-up.'
          }
        },
        400
      )
    }

    const verification = await verifyInvitationToken(invitationToken, options.secret)
    if (!verification.valid) {
      return c.json(
        {
          error: {
            code: 'invalid_invitation',
            message: 'Invitation token is invalid or expired.'
          }
        },
        401
      )
    }

    const invitation = await options.database.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, verification.payload.sub))
      .get()

    if (
      !invitation ||
      invitation.revoked ||
      invitation.jti !== verification.payload.jti ||
      invitation.expiresAt <= now()
    ) {
      return c.json(
        {
          error: {
            code: 'invalid_invitation',
            message: 'Invitation token is invalid or expired.'
          }
        },
        401
      )
    }

    const emailHash = await hashInvitationEmail(parsed.data.email)
    if (
      emailHash !== verification.payload.email_hash ||
      emailHash !== invitation.sentToEmailHash
    ) {
      return c.json(
        {
          error: {
            code: 'invitation_email_mismatch',
            message: 'This invitation does not match that email address.'
          }
        },
        400
      )
    }

    return options.auth.handler(
      new Request(c.req.raw.url, {
        method: c.req.raw.method,
        headers: c.req.raw.headers,
        body: rawBody
      })
    )
  })

  app.post('/migrate-anonymous', async (c) => {
    const session = await getAuthSession(options.auth, c.req.raw)
    if (!session) return unauthorizedResponse()

    const anonymousId = c.req.header(INKLY_ANONYMOUS_ID_HEADER)?.trim()
    if (!anonymousId) {
      return c.json(
        {
          error: {
            code: 'missing_anonymous_id',
            message: 'Missing X-Inkly-Anonymous-Id header'
          }
        },
        400
      )
    }

    const result = await migrateAnonymousOwnership({
      database: options.database,
      anonymousId,
      userId: session.user.id,
      now: options.now
    })

    return c.json({
      migrated: result.migratedBoardCount > 0,
      migratedBoardCount: result.migratedBoardCount,
      removedOwnerCollaboratorCount: result.removedOwnerCollaboratorCount
    })
  })

  app.get('/test/login', async (c) => {
    if (!options.auth.createTestSession) {
      return notFoundTestLoginResponse()
    }

    const parsed = testLoginRedirectSchema.safeParse(c.req.query())
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid query string'
      return c.json(
        {
          error: {
            code: 'invalid_request_query',
            message: issue
          }
        },
        400
      )
    }

    const result = await options.auth.createTestSession(parsed.data)
    const headers = new Headers()
    appendSetCookieHeaders(headers, result.setCookieHeaders)

    if (parsed.data.callbackURL) {
      headers.set('location', parsed.data.callbackURL)
      return new Response(null, {
        status: 302,
        headers
      })
    }

    headers.set('content-type', 'application/json; charset=utf-8')
    return new Response(JSON.stringify(result), {
      status: 200,
      headers
    })
  })

  app.post('/test/login', async (c) => {
    if (!options.auth.createTestSession) {
      return notFoundTestLoginResponse()
    }

    const body = await c.req.json().catch(() => ({}))
    const parsed = testLoginSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(
        {
          error: {
            code: 'invalid_request_body',
            message: issue
          }
        },
        400
      )
    }

    const result = await options.auth.createTestSession(parsed.data)
    const headers = new Headers()
    appendSetCookieHeaders(headers, result.setCookieHeaders)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers
    })
  })

  app.all('/*', (c) => options.auth.handler(c.req.raw))

  return app
}
