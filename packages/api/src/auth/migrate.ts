import { and, eq, inArray } from 'drizzle-orm'

import type { ApiDatabase } from '../db/client.js'
import { boards, collaborators } from '../db/schema.js'

export interface MigrateAnonymousOwnershipOptions {
  database: ApiDatabase
  anonymousId: string
  userId: string
  now?: () => number
}

export interface MigrateAnonymousOwnershipResult {
  migratedBoardCount: number
  removedOwnerCollaboratorCount: number
}

export function migrateAnonymousOwnership(
  options: MigrateAnonymousOwnershipOptions
): MigrateAnonymousOwnershipResult {
  const anonymousId = options.anonymousId.trim()
  const userId = options.userId.trim()
  const now = options.now ?? Date.now

  if (!anonymousId || !userId) {
    return {
      migratedBoardCount: 0,
      removedOwnerCollaboratorCount: 0
    }
  }

  return options.database.db.transaction((tx) => {
    const ownedBoardIds = tx
      .select({ id: boards.id })
      .from(boards)
      .where(eq(boards.creatorAnonymousId, anonymousId))
      .all()
      .map((row) => row.id)

    if (ownedBoardIds.length === 0) {
      return {
        migratedBoardCount: 0,
        removedOwnerCollaboratorCount: 0
      }
    }

    const migratedBoardCount = tx
      .update(boards)
      .set({
        creatorAnonymousId: '',
        creatorUserId: userId,
        updatedAt: now()
      })
      .where(eq(boards.creatorAnonymousId, anonymousId))
      .run().changes

    const removedOwnerCollaboratorCount = tx
      .delete(collaborators)
      .where(
        and(
          inArray(collaborators.boardId, ownedBoardIds),
          eq(collaborators.anonymousId, anonymousId),
          eq(collaborators.role, 'owner')
        )
      )
      .run().changes

    return {
      migratedBoardCount,
      removedOwnerCollaboratorCount
    }
  })
}
