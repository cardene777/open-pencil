#!/usr/bin/env bash
# scripts/dev-api.sh — API server のみを単独起動 (dev:full を使わないとき用)
#
# 使い方:
#   .env.dev (実 secret + Turso 接続) または .env.local (ローカル開発用) を作成してから:
#     bun run dev:api
#
# どちらも無い場合は exit 1 で fail-fast する
# (bun --env-file は missing file を silent skip するため、 ここで明示ガード)。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# .env.dev を優先、 無ければ .env.local。
ENV_FILE=""
ENV_LABEL=""
if [ -f "$REPO_ROOT/.env.dev" ]; then
  ENV_FILE="$REPO_ROOT/.env.dev"
  ENV_LABEL=".env.dev"
elif [ -f "$REPO_ROOT/.env.local" ]; then
  ENV_FILE="$REPO_ROOT/.env.local"
  ENV_LABEL=".env.local"
else
  echo "[dev:api] .env.dev も .env.local も見つかりません。" >&2
  echo "[dev:api] cp $REPO_ROOT/.env.dev.example $REPO_ROOT/.env.dev  (実 secret 用)" >&2
  echo "[dev:api] cp $REPO_ROOT/.env.local.example $REPO_ROOT/.env.local  (完全ローカル用)" >&2
  echo "[dev:api] のどちらかを作成してから再実行してください。" >&2
  exit 1
fi

echo "[dev:api] starting API server on http://localhost:3001 (env: $ENV_LABEL)"

cd "$REPO_ROOT"
exec bun --env-file="$ENV_FILE" run packages/api/src/server.ts
