#!/usr/bin/env bash
# scripts/dev.sh — API server (3001) + Vite (1420) を 1 コマンドで並行起動
#
# 使い方:
#   .env.dev (実 secret + Turso 接続) または .env.local (ローカル開発用) を作成してから:
#     bun run dev:full
#
# 終了は Ctrl+C で両 process を一括停止。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# .env.dev を優先、 無ければ .env.local。 どちらも無ければ fail-fast。
ENV_FILE=""
ENV_LABEL=""
if [ -f "$REPO_ROOT/.env.dev" ]; then
  ENV_FILE="$REPO_ROOT/.env.dev"
  ENV_LABEL=".env.dev"
elif [ -f "$REPO_ROOT/.env.local" ]; then
  ENV_FILE="$REPO_ROOT/.env.local"
  ENV_LABEL=".env.local"
else
  echo "[dev] .env.dev も .env.local も見つかりません。" >&2
  echo "[dev] cp $REPO_ROOT/.env.dev.example $REPO_ROOT/.env.dev  (実 secret 用)" >&2
  echo "[dev] cp $REPO_ROOT/.env.local.example $REPO_ROOT/.env.local  (完全ローカル用)" >&2
  echo "[dev] のどちらかを作成してから再実行してください。" >&2
  exit 1
fi

API_PID=""
VITE_PID=""

cleanup() {
  echo ""
  echo "[dev] shutting down..."
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$VITE_PID" ] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# dev:full + dev:api の cwd を repo root に統一して INKLY_API_DB_PATH の
# 相対パス解決を一貫させる (cwd が異なると DB ファイルが分裂する)
echo "[dev] starting API server on http://localhost:3001 (env: $ENV_LABEL)"
(
  cd "$REPO_ROOT"
  exec bun --env-file="$ENV_FILE" run packages/api/src/server.ts
) &
API_PID=$!

echo "[dev] starting Vite dev server on http://localhost:1420"
# Vite に env-file を preload しない。 Vite 自身に .env / .env.local の優先順
# (local が最強) を解決させ、 開発者が .env.local で override できるようにする。
# (bun --env-file= で process.env に先に注入すると Vite は existing process.env を尊重し、
# .env.local の上書きが効かなくなる)
(
  cd "$REPO_ROOT"
  exec bun run vite
) &
VITE_PID=$!

echo ""
echo "[dev] PIDs — api=$API_PID vite=$VITE_PID"
echo "[dev] Open http://localhost:1420/ (Landing) or /editor"
echo "[dev] Ctrl+C to stop both."
echo ""

# どちらかの child が落ちるまで polling で待つ。
# Bash 4.3+ の `wait -n` は使わない (macOS デフォルト Bash 3.2 では不正オプション)。
EXIT_CODE=0
while true; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[dev] API server exited; stopping vite as well."
    EXIT_CODE=1
    break
  fi
  if ! kill -0 "$VITE_PID" 2>/dev/null; then
    echo "[dev] Vite exited; stopping API server as well."
    EXIT_CODE=1
    break
  fi
  sleep 1
done

exit "$EXIT_CODE"
