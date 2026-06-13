import { Hono } from 'hono'
import { z } from 'zod'

import { getAuthSession, type InklyAuth } from '../auth/index.js'
import type { InternalUserStore } from '../types.js'
import { isInternalDomainEmail } from '../types.js'

const searchInternalUsersSchema = z.object({
  // q 未指定 = ShareModal の初期表示で「sign-up 済みの jfet user 上位 N 件」を要求するケース。
  // 空 query を許容して内部 store が全件 (上位 N 件) を返す経路に流す。
  q: z.string().trim().max(50).optional().default(''),
  limit: z.coerce.number().int().min(1).max(50).default(20)
})

export interface InternalUserRoutesOptions {
  auth: InklyAuth
  internalUserStore: InternalUserStore
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

export function createInternalUserRoutes(options: InternalUserRoutesOptions): Hono {
  const app = new Hono()

  app.get('/internal-users', async (c) => {
    const session = await getAuthSession(options.auth, c.req.raw)
    if (!session || !session.user.id) {
      return errorResponse(401, 'unauthorized', 'Login required')
    }

    if (!isInternalDomainEmail(session.user.email)) {
      return errorResponse(403, 'forbidden', 'Only jfet users can search internal members')
    }

    const parsed = searchInternalUsersSchema.safeParse(c.req.query())
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid query parameters'
      return errorResponse(400, 'invalid_request_query', issue)
    }

    const users = await options.internalUserStore.searchInternalUsersByPrefix(
      parsed.data.q,
      parsed.data.limit
    )

    return c.json({ users })
  })

  return app
}
