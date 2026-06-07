#!/usr/bin/env bash
# scripts/dev.sh — API server (3001) + Vite (1420) を 1 コマンドで並行起動
#
# 使い方:
#   1) cp .env.development.example .env.development  (初回のみ)
#   2) bun run dev:full
#
# 終了は Ctrl+C で両 process を一括停止。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.development"
EXAMPLE_FILE="$REPO_ROOT/.env.development.example"

if [ ! -f "$ENV_FILE" ]; then
  echo "[dev] .env.development が見つかりません。" >&2
  echo "[dev] cp $EXAMPLE_FILE $ENV_FILE してから再実行してください。" >&2
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

echo "[dev] starting API server on http://localhost:3001 (env: $ENV_FILE)"
(
  cd "$REPO_ROOT/packages/api"
  exec bun --env-file="$ENV_FILE" run src/server.ts
) &
API_PID=$!

echo "[dev] starting Vite dev server on http://localhost:1420 (env: $ENV_FILE)"
(
  cd "$REPO_ROOT"
  exec bun --env-file="$ENV_FILE" run vite
) &
VITE_PID=$!

echo ""
echo "[dev] PIDs — api=$API_PID vite=$VITE_PID"
echo "[dev] Open http://localhost:1420/ (Landing) or /editor"
echo "[dev] Ctrl+C to stop both."
echo ""

wait -n "$API_PID" "$VITE_PID" 2>/dev/null || true

EXIT_CODE=0
if ! kill -0 "$API_PID" 2>/dev/null; then
  echo "[dev] API server exited; stopping vite as well."
  EXIT_CODE=1
fi
if ! kill -0 "$VITE_PID" 2>/dev/null; then
  echo "[dev] Vite exited; stopping API server as well."
  EXIT_CODE=1
fi

exit "$EXIT_CODE"
