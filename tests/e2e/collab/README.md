# collab e2e

inkly の collab 系 regression detector。 Playwright マルチ BrowserContext で multi-tab / multi-account シナリオを再現する。

## 実行方法 (推奨)

```bash
bun run test:e2e:collab                  # 全 collab spec
bun run test:e2e:collab avatar-dedup     # 個別 spec
```

このコマンドは `scripts/test-e2e-collab.sh` を経由し、 dev server (port 1420 / 3001) の事前停止チェックを行う。 既に dev server が起動している場合は即停止指示を出して abort する。

## なぜ専用 script なのか

playwright e2e は `mockGoogleLogin` で `/api/auth/test/login` を叩く。 この endpoint は `INKLY_API_AUTH_ENABLE_TEST_UTILS=1` 環境変数を持つ API server でしか有効化されない。

- `bun run dev:full` (`.env.dev` で本番接続) は test util を有効にしないため、 reuse すると全 spec が 404 で fail する
- `playwright.config.ts` の `reuseExistingServer` は default false に変更済 (環境変数 `PLAYWRIGHT_REUSE_DEV_SERVER=1` で reuse 可能、 ただし test util 有効の server を起動した場合のみ)
- 結果として「dev server を止めてから e2e」が再現性ある手順

## 既存 dev server を起動したまま reuse したい場合

明示的に test util を有効にして起動 + reuse 環境変数を立てる。

```bash
# terminal 1
INKLY_API_AUTH_ENABLE_TEST_UTILS=1 INKLY_API_DB_MODE=memory bun --filter @inkly/api dev

# terminal 2
VITE_INKLY_AUTH_TEST_MODE=1 bun run dev

# terminal 3
PLAYWRIGHT_REUSE_DEV_SERVER=1 bunx playwright test --project=inkly tests/e2e/collab
```

## spec を追加するとき

`/collab-e2e-add {scenario}` skill (`~/.claude/skills/collab-e2e-add/`) を使う。 scenario 例 ...

| scenario | 検証 |
|---|---|
| `avatar-dedup` | 同一 user 多 tab で Avatar 1 件 dedup (#235) |
| `realtime-sync-cross-user` | owner / invitee 異 user で sync 双方向 (未実装) |
| `play-preview` | invitee Play ボタンで preview 描画 (未実装) |
| `idle-active-order` | active が上、 idle が下 (未実装) |
| `popover-email` | Avatar click で popover email 表示 (未実装) |
| `revoke-overlay` | 失効モーダル背景の token 透け確認 (未実装) |

## 関連

- `playwright.config.ts` ... `reuseExistingServer` 環境変数化
- `scripts/test-e2e-collab.sh` ... preflight check
- `tests/helpers/e2e-auth.ts:mockGoogleLogin` ... test util 経路
- `~/.claude/skills/collab-e2e-add/SKILL.md` ... spec 追加の SSOT
