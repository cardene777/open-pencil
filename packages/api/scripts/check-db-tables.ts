#!/usr/bin/env bun
import { createClient } from '@libsql/client'

const url = process.env.TURSO_DATABASE_URL?.trim() ?? ''
const token = process.env.TURSO_AUTH_TOKEN?.trim() ?? ''
if (!url) {
  console.error('TURSO_DATABASE_URL not set; abort.')
  process.exit(1)
}
console.log(`Connecting to ${url.replace(/:\/\/.*@/, '://****@')}`)
const client = createClient({ url, authToken: token })

const tables = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
)
console.log('---tables---')
for (const row of tables.rows) {
  console.log(' ', row.name)
}

const docs = await client.execute(
  "SELECT board_id, size, updated_at, updated_by_user_id FROM board_documents ORDER BY updated_at DESC LIMIT 10"
).catch((error) => {
  console.error('board_documents query failed:', error.message)
  return null
})
if (docs) {
  console.log('---board_documents (latest 10)---')
  for (const row of docs.rows) {
    console.log(' ', row.board_id, 'size=', row.size, 'at=', new Date(Number(row.updated_at)).toISOString())
  }
}

const boards = await client.execute("SELECT id, name, creator_user_id, updated_at FROM boards ORDER BY updated_at DESC LIMIT 10")
console.log('---boards (latest 10)---')
for (const row of boards.rows) {
  console.log(' ', row.id, '|', row.name, 'creator=', row.creator_user_id)
}

const collabs = await client.execute(
  "SELECT board_id, anonymous_id, user_id, role, added_at FROM collaborators ORDER BY added_at DESC LIMIT 20"
)
console.log('---collaborators (latest 20)---')
for (const row of collabs.rows) {
  console.log(' ', row.board_id, 'user=', row.user_id, 'anon=', row.anonymous_id, 'role=', row.role)
}

const users = await client.execute("SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT 10")
console.log('---users (latest 10)---')
for (const row of users.rows) {
  console.log(' ', row.id, '|', row.email, '/', row.name)
}

const invitations = await client.execute(
  "SELECT id, board_id, sent_to_email_hash, revoked, expires_at FROM invitations ORDER BY created_at DESC LIMIT 10"
)
console.log('---invitations (latest 10)---')
for (const row of invitations.rows) {
  console.log(' ', row.id, 'board=', row.board_id, 'hash=', String(row.sent_to_email_hash).slice(0, 12), 'revoked=', row.revoked)
}

const cardeneBoards = await client.execute({
  sql: `SELECT DISTINCT b.id, b.name, b.creator_user_id
        FROM boards b
        LEFT JOIN collaborators c ON c.board_id = b.id
        WHERE b.creator_user_id = ? OR c.user_id = ?
        ORDER BY b.updated_at DESC`,
  args: ['sBr4Ki6BQg62mF7CkFpMx27RiVFWPGIQ', 'sBr4Ki6BQg62mF7CkFpMx27RiVFWPGIQ']
})
console.log('---boards visible to cardene777 (listBoardsForUser logic)---')
for (const row of cardeneBoards.rows) {
  console.log(' ', row.id, '|', row.name, 'creator=', row.creator_user_id)
}

client.close()
