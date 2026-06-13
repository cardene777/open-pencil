import type { Board } from '@/app/api/client'

export interface BoardOwnerIdentity {
  anonymousId: string | null
  userId: string | null
}

export function isBoardOwner(board: Board, identity: BoardOwnerIdentity) {
  if (identity.userId) return board.creatorUserId === identity.userId
  if (identity.anonymousId) return board.creatorAnonymousId === identity.anonymousId
  return false
}
