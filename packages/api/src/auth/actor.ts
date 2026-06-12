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

/**
 * board の read 系操作 (open / get / list) を許可するかどうかの判定。
 * creator (isBoardOwner) または collaborators に登録されている user / anonymous なら true。
 *
 * 招待 redeem 経路で collaborator 化された logged-in user は userId match、
 * legacy の匿名招待経路で参加した user は anonymousId match で許可される。
 *
 * 注意 — 本 helper は read 系専用。 update / delete / invite 発行のような
 * owner-only 操作には引き続き isBoardOwner を使うこと。
 */
export function canAccessBoard(board: BoardRecord, actor: RequestActor): boolean {
  if (isBoardOwner(board, actor)) {
    return true
  }

  for (const collaborator of board.collaborators) {
    if (actor.userId && collaborator.userId === actor.userId) {
      return true
    }
    if (actor.anonymousId && collaborator.anonymousId === actor.anonymousId) {
      return true
    }
  }

  return false
}

export async function resolveRequestActor(
  auth: InklyAuth,
  request: Request,
  resolveAnonymous: () => string
): Promise<RequestActor> {
  const session = await getAuthSession(auth, request)
  if (session) {
    return {
      anonymousId: null,
      userId: session.user.id
    }
  }

  return {
    anonymousId: resolveAnonymous(),
    userId: null
  }
}

export function resolveAnonymousActor(c: { req: { raw: Request } }, auth: InklyAuth) {
  return resolveRequestActor(auth, c.req.raw, () => resolveAnonymousId(c as never))
}
