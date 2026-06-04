import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { BoardCollaboratorRecord, InvitationRole } from '../types.js'

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  creatorAnonymousId: text('creator_anonymous_id').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull()
})

export const invitations = sqliteTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id').notNull(),
    sentToEmailHash: text('sent_to_email_hash').notNull(),
    role: text('role').$type<InvitationRole>().notNull(),
    createdAt: integer('created_at', { mode: 'number' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'number' }).notNull(),
    revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false),
    jti: text('jti').notNull(),
    token: text('token')
  },
  (table) => [index('invitations_board_id_idx').on(table.boardId)]
)

export const collaborators = sqliteTable(
  'collaborators',
  {
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    anonymousId: text('anonymous_id').notNull(),
    role: text('role').$type<BoardCollaboratorRecord['role']>().notNull(),
    addedAt: integer('added_at', { mode: 'number' }).notNull(),
    invitationId: text('invitation_id')
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.anonymousId] }),
    index('collaborators_anonymous_id_idx').on(table.anonymousId),
    index('collaborators_invitation_id_idx').on(table.invitationId)
  ]
)
