#!/usr/bin/env bash
# scripts/migrate.sh — drizzle migration を 1 コマンドで適用
#
# 使い方:
#   .env.dev (Turso 接続) または .env.local (ローカル SQLite) を作成してから:
#     bun run migrate          # .env.dev 優先 → .env.local fallback
#     bun run migrate:local    # 必ず .env.local
#     bun run migrate:dev      # 必ず .env.dev
#
# どちらの env file も無い場合は exit 1 で fail-fast する。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

TARGET="${1:-auto}"
ENV_FILE=""
ENV_LABEL=""

case "$TARGET" in
  local)
    if [ ! -f "$REPO_ROOT/.env.local" ]; then
      echo "[migrate] .env.local が見つかりません。" >&2
      echo "[migrate] cp $REPO_ROOT/.env.local.example $REPO_ROOT/.env.local してから再実行してください。" >&2
      exit 1
    fi
    ENV_FILE="$REPO_ROOT/.env.local"
    ENV_LABEL=".env.local"
    ;;
  dev)
    if [ ! -f "$REPO_ROOT/.env.dev" ]; then
      echo "[migrate] .env.dev が見つかりません。" >&2
      echo "[migrate] cp $REPO_ROOT/.env.dev.example $REPO_ROOT/.env.dev (Turso 接続情報入り) してから再実行してください。" >&2
      exit 1
    fi
    ENV_FILE="$REPO_ROOT/.env.dev"
    ENV_LABEL=".env.dev"
    ;;
  auto)
    if [ -f "$REPO_ROOT/.env.dev" ]; then
      ENV_FILE="$REPO_ROOT/.env.dev"
      ENV_LABEL=".env.dev"
    elif [ -f "$REPO_ROOT/.env.local" ]; then
      ENV_FILE="$REPO_ROOT/.env.local"
      ENV_LABEL=".env.local"
    else
      echo "[migrate] .env.dev も .env.local も見つかりません。" >&2
      echo "[migrate] cp $REPO_ROOT/.env.dev.example $REPO_ROOT/.env.dev  (Turso 接続情報入り)" >&2
      echo "[migrate] cp $REPO_ROOT/.env.local.example $REPO_ROOT/.env.local  (ローカル SQLite)" >&2
      echo "[migrate] のどちらかを作成してから再実行してください。" >&2
      exit 1
    fi
    ;;
  *)
    echo "[migrate] 不明な引数: $TARGET (auto / local / dev のいずれか)" >&2
    exit 2
    ;;
esac

echo "[migrate] env=$ENV_LABEL で migration を適用します"

cd "$REPO_ROOT"
exec bun --env-file="$ENV_FILE" run packages/api/src/db/migrate.ts
