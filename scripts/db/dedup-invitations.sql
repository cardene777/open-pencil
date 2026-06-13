-- 同 board + 同 email (sentToEmailHash 一致) の active 招待が複数ある場合、
-- 最新 (createdAt 最大) 1 件だけ残して残りを revoke する。
--
-- 使い方
--   turso db shell <db-name> < scripts/db/dedup-invitations.sql
--
-- まず dry-run で何件影響するか確認したい場合 ... SELECT 文を先に実行する。

-- ▼ dry-run 用 確認 SELECT (実行前に影響件数を見るとき、 コメントアウトを外して実行)
-- SELECT
--   board_id,
--   sent_to_email_hash,
--   COUNT(*) AS active_count
-- FROM invitations
-- WHERE revoked = 0
-- GROUP BY board_id, sent_to_email_hash
-- HAVING COUNT(*) > 1;

-- ▼ 本番反映 ... 各 (board_id, sent_to_email_hash) 群で最新以外を revoke
UPDATE invitations
SET revoked = 1
WHERE revoked = 0
  AND id NOT IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY board_id, sent_to_email_hash
               ORDER BY created_at DESC, id DESC
             ) AS rn
      FROM invitations
      WHERE revoked = 0
    )
    WHERE rn = 1
  );

-- ▼ 完全削除を希望する場合 (履歴も残さない、 推奨はしない)
-- 注意 ... revoked 招待は dashboard の招待リンク一覧で「失効」表示の根拠になるので、
-- 完全削除は招待 token 経由の 404 を増やす可能性あり。 通常は上の UPDATE で十分。
-- DELETE FROM invitations
-- WHERE revoked = 1;
