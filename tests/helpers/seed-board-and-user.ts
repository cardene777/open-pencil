import type { ApiDatabase } from '../../packages/api/src/db/client.js'
import { boards, users } from '../../packages/api/src/db/schema.js'

export async function seedUserAndBoard(
  database: ApiDatabase,
  params: { userEmail: string; userName?: string }
) {
  const userId = crypto.randomUUID()
  const boardId = crypto.randomUUID()
  const now = Date.now()

  await database.db
    .insert(users)
    .values({
      id: userId,
      name: params.userName ?? 'Test User',
      email: params.userEmail,
      emailVerified: false,
      image: null,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    })
    .run()

  await database.db
    .insert(boards)
    .values({
      id: boardId,
      name: 'Test Board',
      creatorAnonymousId: 'anon-creator',
      creatorUserId: userId,
      teamId: null,
      createdAt: now,
      updatedAt: now
    })
    .run()

  return { userId, boardId }
}
