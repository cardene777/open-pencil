import { Hono } from 'hono'
import { z } from 'zod'

import { resolveAnonymousId } from '../anonymousId.js'
import { canAccessBoard, isBoardOwner, resolveRequestActor } from '../auth/actor.js'
import { getAuthSession, type InklyAuth } from '../auth/index.js'
import type {
  BoardDocumentStore,
  BoardStore,
  InternalUserStore,
  InvitationStore,
  NotificationStore,
  PendingInternalInvitationStore
} from '../types.js'
import { INVITATION_ROLES, isInternalDomainEmail } from '../types.js'

const createBoardSchema = z.object({
  name: z.string().trim().min(1).max(120).default('Untitled board')
})

const shareBoardSchema = z.object({
  emails: z.array(z.string().trim().email()).min(1).max(50),
  role: z.enum(INVITATION_ROLES).default('editor')
})

const updateBoardStartFrameSchema = z.object({
  startFrameId: z.string().trim().min(1).max(256).nullable()
})

interface ValidationErrorBody {
  error: {
    code: string
    message: string
  }
}

export interface BoardRoutesOptions {
  auth: InklyAuth
  boardStore: BoardStore
  invitationStore: InvitationStore
  internalUserStore?: InternalUserStore
  pendingInternalInvitationStore?: PendingInternalInvitationStore
  notificationStore?: NotificationStore
  boardDocumentStore?: BoardDocumentStore
}

function validationError(message: string): ValidationErrorBody {
  return {
    error: {
      code: 'invalid_request_body',
      message
    }
  }
}

function forbiddenResponse(message: string) {
  return Response.json(
    {
      error: {
        code: 'forbidden',
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

export function createBoardRoutes(options: BoardRoutesOptions): Hono {
  const app = new Hono()

  app.get('/boards', async (c) => {
    const session = await getAuthSession(options.auth, c.req.raw)

    if (!session) {
      const anonymousId = resolveAnonymousId(c)
      const boards = await options.boardStore.listBoardsForAnonymous(anonymousId)
      return c.json({ boards })
    }

    return c.json({
      boards: await options.boardStore.listBoardsForUser(session.user.id)
    })
  })

  app.post('/boards', async (c) => {
    const body = await c.req.json().catch(() => ({}))
    const parsed = createBoardSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(validationError(issue), 400)
    }

    const session = await getAuthSession(options.auth, c.req.raw)

    if (session) {
      const board = await options.boardStore.createBoard({
        name: parsed.data.name,
        creatorAnonymousId: '',
        creatorUserId: session.user.id
      })
      return c.json(board, 201)
    }

    const anonymousId = resolveAnonymousId(c)
    const board = await options.boardStore.createBoard({
      name: parsed.data.name,
      creatorAnonymousId: anonymousId,
      creatorUserId: null
    })
    return c.json(board, 201)
  })

  app.delete('/boards/:id', async (c) => {
    const board = await options.boardStore.findBoard(c.req.param('id'))
    if (!board) return notFoundResponse('board_not_found', 'Board not found')

    const actor = await resolveRequestActor(options.auth, c.req.raw, () => resolveAnonymousId(c))
    if (!isBoardOwner(board, actor)) {
      return forbiddenResponse('Only the creator can delete this board')
    }

    await options.boardStore.deleteBoard(board.id)
    return c.json({ deleted: true })
  })

  app.patch('/boards/:id/start-frame', async (c) => {
    const board = await options.boardStore.findBoard(c.req.param('id'))
    if (!board) return notFoundResponse('board_not_found', 'Board not found')

    const actor = await resolveRequestActor(options.auth, c.req.raw, () => resolveAnonymousId(c))
    if (!isBoardOwner(board, actor)) {
      return forbiddenResponse('Only the creator can update the board start frame')
    }

    const body = await c.req.json().catch(() => null)
    const parsed = updateBoardStartFrameSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(validationError(issue), 400)
    }

    const updatedBoard = await options.boardStore.updateBoardStartFrame(
      board.id,
      parsed.data.startFrameId
    )
    if (!updatedBoard) return notFoundResponse('board_not_found', 'Board not found')

    return c.json({ board: updatedBoard })
  })

  app.get('/boards/:id/invitations', async (c) => {
    const board = await options.boardStore.findBoard(c.req.param('id'))
    if (!board) return notFoundResponse('board_not_found', 'Board not found')

    const actor = await resolveRequestActor(options.auth, c.req.raw, () => resolveAnonymousId(c))
    if (!isBoardOwner(board, actor)) {
      return forbiddenResponse('Only the creator can view invitations')
    }

    return c.json({
      board,
      invitations: await options.invitationStore.listInvitationsByBoardId(board.id)
    })
  })

  app.delete('/boards/:id/invitations/:invitationId', async (c) => {
    const board = await options.boardStore.findBoard(c.req.param('id'))
    if (!board) return notFoundResponse('board_not_found', 'Board not found')

    const actor = await resolveRequestActor(options.auth, c.req.raw, () => resolveAnonymousId(c))
    if (!isBoardOwner(board, actor)) {
      return forbiddenResponse('Only the creator can revoke invitations')
    }

    const invitation = await options.invitationStore.revokeInvitation(c.req.param('invitationId'))
    if (!invitation || invitation.boardId !== board.id) {
      return notFoundResponse('invitation_not_found', 'Invitation not found')
    }

    return c.json({ invitation })
  })

  // jfet 内部 user 専用の share endpoint。
  // - logged-in jfet user → collaborators に直接追加 (招待 token なし)
  // - 未 sign-up jfet user → pending_internal_invitations に pre-record
  //   (初回 sign-in 時に auth hook が collaborators に転記する)
  // - 非 jfet domain は 400 で reject (外部 email は別 endpoint `POST /invite` を使う)
  app.post('/boards/:id/share', async (c) => {
    if (!options.internalUserStore || !options.pendingInternalInvitationStore) {
      return Response.json(
        {
          error: {
            code: 'unsupported',
            message: 'Internal share endpoint is not configured'
          }
        },
        { status: 501 }
      )
    }

    const board = await options.boardStore.findBoard(c.req.param('id'))
    if (!board) return notFoundResponse('board_not_found', 'Board not found')

    const session = await getAuthSession(options.auth, c.req.raw)
    if (!session) {
      return Response.json(
        {
          error: {
            code: 'unauthorized',
            message: 'Sign-in required to share boards'
          }
        },
        { status: 401 }
      )
    }

    const actor = await resolveRequestActor(options.auth, c.req.raw, () => resolveAnonymousId(c))
    if (!isBoardOwner(board, actor)) {
      return forbiddenResponse('Only the creator can share this board')
    }

    const body = await c.req.json().catch(() => null)
    const parsed = shareBoardSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json(validationError(issue), 400)
    }

    // dedup + normalize
    const normalized = Array.from(new Set(parsed.data.emails.map((e) => e.trim().toLowerCase())))

    const added: { email: string; userId: string }[] = []
    const pending: { email: string }[] = []
    const rejected: { email: string; reason: string }[] = []

    for (const email of normalized) {
      if (!isInternalDomainEmail(email)) {
        rejected.push({ email, reason: 'non_internal_domain' })
        continue
      }

      const internal = await options.internalUserStore.findInternalUserByEmail(email)
      if (internal?.userId) {
        // logged-in jfet user → 直接 collaborator 化
        await options.boardStore.addCollaborator(board.id, {
          anonymousId: `internal:${internal.userId}`,
          userId: internal.userId,
          role: parsed.data.role,
          invitationId: null
        })
        added.push({ email, userId: internal.userId })

        // 招待された jfet user の dashboard / notifications にリアルタイムで反映するため、
        // notificationStore 経由で notification を 1 件発行する。 createNotification は
        // 内部で onNotificationCreated を呼び、 そこから notifications WS server が
        // 該当 user の接続全てに push する設計 (`server.ts` で配線済)。
        if (options.notificationStore) {
          try {
            await options.notificationStore.createNotification({
              userId: internal.userId,
              type: 'invitation',
              payload: {
                invitationId: `direct:${board.id}:${internal.userId}`,
                boardId: board.id,
                boardName: board.name,
                role: parsed.data.role,
                inviterDisplayName: session.user.name ?? session.user.email,
                inviteeEmail: email,
                url: `/board/${board.id}`
              }
            })
          } catch (error) {
            console.warn('[boards.share] failed to emit invitation notification', error)
          }
        }
      } else {
        // 未 sign-up jfet user → pending pre-record
        await options.pendingInternalInvitationStore.createPendingInvitation({
          boardId: board.id,
          email,
          role: parsed.data.role,
          invitedByUserId: session.user.id
        })
        pending.push({ email })
      }
    }

    return c.json({ added, pending, rejected })
  })

  /**
   * board document を一元 SSOT として GET / PUT する。
   * owner / collaborator (canAccessBoard) のみアクセス可能、
   * IndexedDB cache はクライアント側 fast-path にとどめ、 ここを server 側真値とする。
   */
  app.get('/boards/:id/document', async (c) => {
    if (!options.boardDocumentStore) {
      return Response.json(
        { error: { code: 'unsupported', message: 'Document store is not configured' } },
        { status: 501 }
      )
    }

    const board = await options.boardStore.findBoard(c.req.param('id'))
    if (!board) return notFoundResponse('board_not_found', 'Board not found')

    const actor = await resolveRequestActor(options.auth, c.req.raw, () => resolveAnonymousId(c))
    if (!canAccessBoard(board, actor)) {
      return forbiddenResponse('You do not have access to this board')
    }

    const document = await options.boardDocumentStore.findDocument(board.id)
    if (!document) {
      return Response.json(
        { error: { code: 'document_not_found', message: 'No document stored yet' } },
        { status: 404 }
      )
    }

    return new Response(document.bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': String(document.size),
        'x-document-updated-at': String(document.updatedAt)
      }
    })
  })

  app.put('/boards/:id/document', async (c) => {
    if (!options.boardDocumentStore) {
      return Response.json(
        { error: { code: 'unsupported', message: 'Document store is not configured' } },
        { status: 501 }
      )
    }

    const board = await options.boardStore.findBoard(c.req.param('id'))
    if (!board) return notFoundResponse('board_not_found', 'Board not found')

    const session = await getAuthSession(options.auth, c.req.raw)
    const actor = await resolveRequestActor(options.auth, c.req.raw, () => resolveAnonymousId(c))
    if (!canAccessBoard(board, actor)) {
      return forbiddenResponse('You do not have access to this board')
    }

    const buffer = await c.req.arrayBuffer()
    if (!buffer || buffer.byteLength === 0) {
      return c.json(validationError('Empty document body'), 400)
    }

    const record = await options.boardDocumentStore.upsertDocument({
      boardId: board.id,
      bytes: new Uint8Array(buffer),
      updatedByUserId: session?.user.id ?? null
    })

    return c.json({
      boardId: record.boardId,
      size: record.size,
      updatedAt: record.updatedAt
    })
  })

  return app
}
