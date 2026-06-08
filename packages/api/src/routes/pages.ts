import { Hono } from 'hono'
import { z } from 'zod'

import { resolveAnonymousId } from '../anonymousId.js'
import { isBoardCollaborator, resolveRequestActor } from '../auth/actor.js'
import type { InklyAuth } from '../auth/index.js'
import type { BoardRecord, BoardStore, PageStore } from '../types.js'

const createPageSchema = z.object({
  name: z.string().trim().min(1).max(120).default('Sheet'),
  position: z.number().int().optional()
})

const updatePageSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  position: z.number().int().optional()
})

const updatePageContentSchema = z.object({
  content: z.string()
})

interface ValidationErrorBody {
  error: {
    code: string
    message: string
  }
}

export interface PageRoutesOptions {
  auth: InklyAuth
  boardStore: BoardStore
  pageStore: PageStore
}

function validationError(message: string): ValidationErrorBody {
  return {
    error: {
      code: 'invalid_request_body',
      message
    }
  }
}

function forbiddenResponse(message: string, code = 'forbidden') {
  return Response.json(
    {
      error: {
        code,
        message
      }
    },
    { status: 403 }
  )
}

function notFoundResponse(code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message
      }
    },
    { status: 404 }
  )
}

function badRequestResponse(code: string, message: string) {
  return Response.json(
    {
      error: {
        code,
        message
      }
    },
    { status: 400 }
  )
}

export function createPageRoutes(options: PageRoutesOptions): Hono {
  const app = new Hono()

  async function canAccessBoard(board: BoardRecord, request: Request, anonymousId: string) {
    const actor = await resolveRequestActor(options.auth, request, () => anonymousId)
    if (isBoardCollaborator(board, actor)) return true

    if (!actor.userId) return false

    return await options.boardStore.hasAcceptedInvitationForUser(board.id, actor.userId)
  }

  async function requireBoardAccess(c: { req: { raw: Request; param: (name: string) => string } }) {
    const board = await options.boardStore.findBoard(c.req.param('boardId'))
    if (!board) return { board: null, response: notFoundResponse('board_not_found', 'Board not found') }

    const anonymousId = resolveAnonymousId(c as never)
    const canAccess = await canAccessBoard(board, c.req.raw, anonymousId)
    if (!canAccess) {
      return {
        board: null,
        response: forbiddenResponse('Only board collaborators can access pages')
      }
    }

    return { board, response: null }
  }

  app.get('/boards/:boardId/pages', async (c) => {
    const access = await requireBoardAccess(c)
    if (access.response) return access.response
    return c.json({ pages: await options.pageStore.listPagesForBoard(access.board.id) })
  })

  app.post('/boards/:boardId/pages', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const parsed = createPageSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(validationError(issue), 400)
    }

    const access = await requireBoardAccess(c)
    if (access.response) return access.response

    const existingPages = await options.pageStore.listPagesForBoard(access.board.id)
    const position = parsed.data.position ?? existingPages.length
    const page = await options.pageStore.createPage({
      boardId: access.board.id,
      name: parsed.data.name,
      position
    })
    return c.json(page, 201)
  })

  app.patch('/boards/:boardId/pages/:pageId', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const parsed = updatePageSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(validationError(issue), 400)
    }

    const access = await requireBoardAccess(c)
    if (access.response) return access.response

    const page = await options.pageStore.findPage(c.req.param('pageId'))
    if (!page || page.boardId !== access.board.id) {
      return notFoundResponse('page_not_found', 'Page not found')
    }

    const updated = await options.pageStore.updatePage(page.id, parsed.data)
    if (!updated) return notFoundResponse('page_not_found', 'Page not found')
    return c.json(updated)
  })

  app.delete('/boards/:boardId/pages/:pageId', async (c) => {
    const access = await requireBoardAccess(c)
    if (access.response) return access.response

    const existingPages = await options.pageStore.listPagesForBoard(access.board.id)
    if (existingPages.length <= 1) {
      return badRequestResponse(
        'last_page_delete_denied',
        'A board must keep at least one page'
      )
    }

    const page = existingPages.find((entry) => entry.id === c.req.param('pageId'))
    if (!page) return notFoundResponse('page_not_found', 'Page not found')

    await options.pageStore.deletePage(page.id)
    return c.json({ deleted: true })
  })

  app.get('/boards/:boardId/pages/:pageId/content', async (c) => {
    const access = await requireBoardAccess(c)
    if (access.response) return access.response

    const page = await options.pageStore.findPage(c.req.param('pageId'))
    if (!page || page.boardId !== access.board.id) {
      return notFoundResponse('page_not_found', 'Page not found')
    }

    const content = await options.pageStore.getPageContent(page.id)
    if (!content) return notFoundResponse('page_not_found', 'Page not found')
    return c.json(content)
  })

  app.put('/boards/:boardId/pages/:pageId/content', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const parsed = updatePageContentSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(validationError(issue), 400)
    }

    const access = await requireBoardAccess(c)
    if (access.response) return access.response

    const page = await options.pageStore.findPage(c.req.param('pageId'))
    if (!page || page.boardId !== access.board.id) {
      return notFoundResponse('page_not_found', 'Page not found')
    }

    await options.pageStore.savePageContent(page.id, parsed.data.content)
    return c.json({ saved: true })
  })

  return app
}
