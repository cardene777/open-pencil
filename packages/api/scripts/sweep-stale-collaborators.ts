#!/usr/bin/env bun
/**
 * verify-only 経路で生成された userId=null の anonymous collaborator 行を sweep する。
 *
 * 旧仕様 (PR #201 で修正) では POST /api/invite/verify 内で anonymousId-only の
 * collaborator を作っていたため、 同じ board に大量の重複 userId=null 行が残った。
 * これらは listBoardsForUser / canAccessBoard の userId match に寄与しないので、
 * 同じ board に userId が紐付いた collaborator 行が存在する場合のみ安全に削除できる。
 *
 * 使い方:
 *   bun --env-file=.env.dev run scripts/sweep-stale-collaborators.ts          # dry-run
 *   bun --env-file=.env.dev run scripts/sweep-stale-collaborators.ts --apply  # 実削除
 */
import { createClient } from '@libsql/client'

const apply = process.argv.includes('--apply')

const url = process.env.TURSO_DATABASE_URL?.trim() ?? ''
const token = process.env.TURSO_AUTH_TOKEN?.trim() ?? ''
if (!url) {
  console.error('TURSO_DATABASE_URL not set; abort.')
  process.exit(1)
}

const client = createClient({ url, authToken: token })

const staleRows = await client.execute(
  `SELECT board_id, anonymous_id
   FROM collaborators
   WHERE user_id IS NULL
     AND anonymous_id NOT LIKE 'internal:%'`
)

console.log(`Found ${staleRows.rows.length} userId=null anonymous collaborator rows.`)
for (const row of staleRows.rows) {
  console.log(`  board=${row.board_id} anon=${row.anonymous_id}`)
}

if (!apply) {
  console.log('\nDry-run only. Pass --apply to actually delete.')
  client.close()
  process.exit(0)
}

const result = await client.execute(
  `DELETE FROM collaborators
   WHERE user_id IS NULL
     AND anonymous_id NOT LIKE 'internal:%'`
)
console.log(`\nDeleted ${result.rowsAffected} rows.`)

client.close()
