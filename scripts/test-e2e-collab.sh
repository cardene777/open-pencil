#!/usr/bin/env bash
# scripts/test-e2e-collab.sh — collab e2e を再現性ある形で実行する
#
# 既存 dev server (.env.dev / 本番接続) が port 1420 / 3001 で動いていると
# playwright は test-util 無効のままその server を reuse してしまうため、
# まず存在チェックして停止指示を出し、 その後 playwright が test 専用 server を
# 起動する経路を通す。
#
# 使い方:
#   bun run test:e2e:collab                  # 全 collab spec
#   bun run test:e2e:collab avatar-dedup     # 個別 spec

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 引数 ... 個別 spec 名 (拡張子なし) を渡せる、 無ければ collab dir 全件。
SPEC_FILTER=""
if [ $# -gt 0 ]; then
  SPEC_FILTER="tests/e2e/collab/${1}.spec.ts"
  if [ ! -f "$SPEC_FILTER" ]; then
    echo "[test-e2e-collab] spec not found: $SPEC_FILTER" >&2
    exit 1
  fi
else
  SPEC_FILTER="tests/e2e/collab"
fi

# port 1420 / 3001 が他 process で使われていないか確認。
check_port_in_use() {
  local port=$1
  lsof -ti :"$port" 2>/dev/null || true
}

VITE_PID="$(check_port_in_use 1420)"
API_PID="$(check_port_in_use 3001)"

if [ -n "$VITE_PID" ] || [ -n "$API_PID" ]; then
  echo "" >&2
  echo "[test-e2e-collab] port 1420 / 3001 が他 process で使用中です" >&2
  [ -n "$VITE_PID" ] && echo "  - vite (1420) PID: $VITE_PID" >&2
  [ -n "$API_PID" ] && echo "  - api (3001) PID: $API_PID" >&2
  echo "" >&2
  echo "既存 dev server (.env.dev 等) は INKLY_API_AUTH_ENABLE_TEST_UTILS=1 が無いため" >&2
  echo "test-util 経路 (/api/auth/test/login) が 404 になり、 全 collab spec が fail します。" >&2
  echo "" >&2
  echo "対処:" >&2
  echo "  1. dev server を Ctrl+C で停止" >&2
  echo "  2. もう一度 'bun run test:e2e:collab' を実行" >&2
  echo "" >&2
  echo "もしくは reuse したい場合 ... bun run dev:full を" >&2
  echo "  INKLY_API_AUTH_ENABLE_TEST_UTILS=1 bun --filter @inkly/api dev" >&2
  echo "  + VITE_INKLY_AUTH_TEST_MODE=1 bun run dev" >&2
  echo "で起動し、 PLAYWRIGHT_REUSE_DEV_SERVER=1 を付けて本 script を呼ぶ" >&2
  exit 1
fi

echo "[test-e2e-collab] dev server 未起動 OK、 playwright が test 専用 server を起動します"
echo "[test-e2e-collab] target: $SPEC_FILTER"
echo ""

exec bunx playwright test --project=inkly "$SPEC_FILTER"
