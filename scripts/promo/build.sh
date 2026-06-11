#!/usr/bin/env bash
# scripts/promo/build.sh — Remotion 紹介動画 完全自動生成
#
# 流れ:
#   1. 既存 local dev server を kill
#   2. promo 用 local API server を test/login 有効化付きで起動 (in-memory DB)
#   3. promo 用 Vite を起動 (1420)
#   4. server 起動待ち
#   5. capture.ts で test login + demo board 作成 + 全画面 screenshot
#   6. Remotion で render
#   7. 起動した server を kill
#
# 出力: scripts/promo/output/pencil-editor-promo.mp4
#
# 注意: production の Google ログインは一切使わない、 個人情報なし。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

PROMO_ENV="$REPO_ROOT/scripts/promo/.env.promo"
REMOTION_DIR="$REPO_ROOT/scripts/promo/remotion"
SKIP_CAPTURE=0

for arg in "$@"; do
  case "$arg" in
    --skip-capture) SKIP_CAPTURE=1 ;;
  esac
done

if [ ! -f "$PROMO_ENV" ]; then
  echo "❌ $PROMO_ENV が無い"
  exit 1
fi

API_PID=""
VITE_PID=""

cleanup() {
  echo ""
  echo "[promo] shutting down local servers..."
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [ -n "$VITE_PID" ] && kill -0 "$VITE_PID" 2>/dev/null; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

# 既存のポート使用プロセスを kill
echo "[promo] cleaning up existing dev servers on :3001 :1420..."
lsof -ti tcp:3001 2>/dev/null | xargs -r kill -9 2>/dev/null || true
lsof -ti tcp:1420 2>/dev/null | xargs -r kill -9 2>/dev/null || true
sleep 1

# Playwright Chromium 確認
if ! ls "$HOME/Library/Caches/ms-playwright/chromium"-* >/dev/null 2>&1; then
  echo "📦 Playwright Chromium が無いので install..."
  bunx playwright install chromium
fi

# Remotion deps install (初回のみ)
if [ ! -d "$REMOTION_DIR/node_modules" ]; then
  echo "📦 Remotion 依存を install..."
  (cd "$REMOTION_DIR" && bun install)
fi

if [ "$SKIP_CAPTURE" -eq 0 ]; then
  echo ""
  echo "═══════════════════════════════════"
  echo "▶ Phase 1: local server 起動"
  echo "═══════════════════════════════════"

  echo "[promo] API server (test/login 有効、 in-memory DB)..."
  (
    cd "$REPO_ROOT"
    exec bun --env-file="$PROMO_ENV" run packages/api/src/server.ts \
      > "$REPO_ROOT/scripts/promo/.api.log" 2>&1
  ) &
  API_PID=$!

  echo "[promo] Vite (port 1420)..."
  (
    cd "$REPO_ROOT"
    exec bun run vite > "$REPO_ROOT/scripts/promo/.vite.log" 2>&1
  ) &
  VITE_PID=$!

  echo "[promo] PIDs — api=$API_PID vite=$VITE_PID"

  # 起動待ち (max 60 秒、 polling 間隔 1 秒)
  echo "[promo] waiting for servers..."
  API_OK=0
  VITE_OK=0
  for i in $(seq 1 60); do
    # `-f` は 4xx/5xx を fail 扱い、 401 が返ってきても起動 OK なので付けない。
    # curl が接続できれば retry エラー等を含めず連結したコードを返すので、
    # 3 桁の HTTP コード (100-599) のみを「OK」と判定する。
    # 接続失敗時は "000" + retry エラー文字列で長くなることがあるため、 正規表現で 3 桁判定。
    if [ $API_OK -eq 0 ]; then
      API_CODE=$(curl -s -o /dev/null --max-time 2 -w '%{http_code}' "http://127.0.0.1:3001/api/auth/session" 2>/dev/null || echo "000")
      if [[ "$API_CODE" =~ ^[1-5][0-9][0-9]$ ]]; then
        echo "[promo] ✓ API server is up (${i}s, HTTP $API_CODE)"
        API_OK=1
      fi
    fi
    if [ $VITE_OK -eq 0 ]; then
      # Vite は default で localhost (IPv6 + IPv4 両方) bind、 127.0.0.1 直接が
      # IPv6-only リスナーだと接続できないことがある、 localhost で check する。
      VITE_CODE=$(curl -s -o /dev/null --max-time 2 -w '%{http_code}' "http://localhost:1420/" 2>/dev/null || echo "000")
      if [[ "$VITE_CODE" =~ ^[1-5][0-9][0-9]$ ]]; then
        echo "[promo] ✓ Vite is up (${i}s, HTTP $VITE_CODE)"
        VITE_OK=1
      fi
    fi
    if [ $API_OK -eq 1 ] && [ $VITE_OK -eq 1 ]; then
      break
    fi
    sleep 1
  done

  if [ $API_OK -eq 0 ]; then
    echo "❌ API server が起動しなかった (scripts/promo/.api.log を確認)"
    tail -40 "$REPO_ROOT/scripts/promo/.api.log" 2>/dev/null
    exit 1
  fi
  if [ $VITE_OK -eq 0 ]; then
    echo "❌ Vite が起動しなかった (scripts/promo/.vite.log を確認)"
    tail -40 "$REPO_ROOT/scripts/promo/.vite.log" 2>/dev/null
    exit 1
  fi

  # CanvasKit-wasm のローカル提供等、 関連リソースが落ち着くまで追加で待つ
  sleep 5

  echo ""
  echo "═══════════════════════════════════"
  echo "▶ Phase 2: LP screenshot (hero / features / outro)"
  echo "═══════════════════════════════════"
  bun scripts/promo/capture.ts --url "http://localhost:1420"

  echo ""
  echo "═══════════════════════════════════"
  echo "▶ Phase 2b: ユーザーフロー録画 (dashboard → editor → share)"
  echo "═══════════════════════════════════"
  bun scripts/promo/record-flow.ts --url "http://localhost:1420"


  echo ""
  echo "[promo] killing local servers..."
  cleanup
  trap - EXIT INT TERM
fi

echo ""
echo "═══════════════════════════════════"
echo "▶ Phase 3: Remotion で render"
echo "═══════════════════════════════════"
mkdir -p "$REMOTION_DIR/out"
(cd "$REMOTION_DIR" && bun run render)

echo ""
echo "═══════════════════════════════════"
echo "✅ 完成"
echo "═══════════════════════════════════"

mkdir -p "$REPO_ROOT/scripts/promo/output"
cp -f "$REMOTION_DIR/out/pencil-editor-promo.mp4" \
  "$REPO_ROOT/scripts/promo/output/pencil-editor-promo.mp4"

FINAL="$REPO_ROOT/scripts/promo/output/pencil-editor-promo.mp4"
echo "出力: $FINAL"
du -h "$FINAL" | awk '{ print "   size: " $1 }'
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$FINAL" 2>/dev/null | \
  awk '{ printf "   duration: %.2fs\n", $1 }'
echo ""
echo "再生: open $FINAL"
echo "Studio: cd scripts/promo/remotion && bun run studio"
