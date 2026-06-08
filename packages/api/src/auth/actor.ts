import { resolveAnonymousId } from '../anonymousId.js'
import type { BoardRecord } from '../types.js'
import { getAuthSession, type InklyAuth } from './index.js'

export interface RequestActor {
  anonymousId: string | null
  userId: string | null
}

export function isBoardOwner(board: BoardRecord, actor: RequestActor) {
  if (actor.userId) {
    return board.creatorUserId === actor.userId
  }

  if (actor.anonymousId) {
    return board.creatorAnonymousId === actor.anonymousId
  }

  return false
}

export function isBoardCollaborator(board: BoardRecord, actor: RequestActor) {
  if (isBoardOwner(board, actor)) return true

  const anonymousId = actor.anonymousId?.trim()
  if (!anonymousId) return false

  return board.collaborators.some((collaborator) => collaborator.anonymousId === anonymousId)
}

export async function resolveRequestActor(
  auth: InklyAuth,
  request: Request,
  resolveAnonymous: () => string | null
): Promise<RequestActor> {
  const anonymousId = resolveAnonymous()?.trim() || null
  const session = await getAuthSession(auth, request)
  if (session) {
    return {
      anonymousId,
      userId: session.user.id
    }
  }

  return {
    anonymousId,
    userId: null
  }
}

export function resolveAnonymousActor(c: { req: { raw: Request } }, auth: InklyAuth) {
  return resolveRequestActor(auth, c.req.raw, () => resolveAnonymousId(c as never))
}
