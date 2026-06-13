import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import type { BoardCollaboratorRecord, InvitationRole } from '../types.js'

export const boards = sqliteTable('boards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  creatorAnonymousId: text('creator_anonymous_id').notNull(),
  creatorUserId: text('creator_user_id').references(() => users.id, { onDelete: 'set null' }),
  startFrameId: text('start_frame_id'),
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
    // 招待 redeem 経由で logged-in user が collaborator 化されたときに紐付ける user.id。
    // anonymous (未ログイン) 経由の collaborator は null のまま、 後で sign-in した時に
    // anonymousId と user.id を結びつけるための列。
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    role: text('role').$type<BoardCollaboratorRecord['role']>().notNull(),
    addedAt: integer('added_at', { mode: 'number' }).notNull(),
    invitationId: text('invitation_id')
  },
  (table) => [
    primaryKey({ columns: [table.boardId, table.anonymousId] }),
    index('collaborators_anonymous_id_idx').on(table.anonymousId),
    index('collaborators_user_id_idx').on(table.userId),
    index('collaborators_invitation_id_idx').on(table.invitationId)
  ]
)

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
    image: text('image'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)]
)

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
  },
  (table) => [
    uniqueIndex('sessions_token_unique').on(table.token),
    index('sessions_user_id_idx').on(table.userId)
  ]
)

export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    payload: text('payload').notNull(),
    readAt: integer('read_at', { mode: 'number' }),
    createdAt: integer('created_at', { mode: 'number' }).notNull()
  },
  (table) => [
    index('notifications_user_id_idx').on(table.userId),
    index('notifications_read_at_idx').on(table.readAt),
    index('notifications_created_at_idx').on(table.createdAt)
  ]
)

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)]
)

export const verifications = sqliteTable(
  'verifications',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
  },
  (table) => [
    index('verifications_identifier_idx').on(table.identifier),
    index('verifications_expires_at_idx').on(table.expiresAt)
  ]
)

export const internalUsers = sqliteTable(
  'internal_users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    addedAt: integer('added_at', { mode: 'number' }).notNull()
  },
  (table) => [
    uniqueIndex('internal_users_email_unique').on(table.email),
    index('internal_users_user_id_idx').on(table.userId)
  ]
)

export const boardDocuments = sqliteTable(
  'board_documents',
  {
    boardId: text('board_id')
      .primaryKey()
      .references(() => boards.id, { onDelete: 'cascade' }),
    // .fig binary blob (Uint8Array). owner / collaborator が同じ source を読むため
    // server DB を SSOT とする。 IndexedDB cache は high-priority read 用の fast-path。
    bytes: text('bytes').notNull(),
    size: integer('size', { mode: 'number' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
    updatedByUserId: text('updated_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    })
  },
  (table) => [index('board_documents_updated_at_idx').on(table.updatedAt)]
)

export const pendingInternalInvitations = sqliteTable(
  'pending_internal_invitations',
  {
    id: text('id').primaryKey(),
    boardId: text('board_id')
      .notNull()
      .references(() => boards.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').$type<InvitationRole>().notNull(),
    invitedByUserId: text('invited_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'number' }).notNull()
  },
  (table) => [
    index('pending_internal_invitations_email_idx').on(table.email),
    index('pending_internal_invitations_board_id_idx').on(table.boardId)
  ]
)
