#!/usr/bin/env bun
/**
 * scripts/promo/record-editor.ts — エディタの「実操作」を Playwright で録画。
 *
 * 流れ:
 *   1. test/login で demo user 認証
 *   2. demo board を 1 つ作成
 *   3. board を開く
 *   4. window.inkly.openFile('/promo-design.pen') で .pen をロード
 *   5. ツール切替・カーソル移動・スクロールで「操作している感」を出す
 *   6. 録画 webm を保存
 *
 * 出力: scripts/promo/remotion/public/clips/editor-demo.webm
 */
import { chromium } from '@playwright/test'
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const urlArgIndex = args.indexOf('--url')
const TARGET_URL =
  urlArgIndex >= 0 && args[urlArgIndex + 1] ? args[urlArgIndex + 1] : 'http://localhost:1420'
const API_URL = TARGET_URL.includes('1420') ? 'http://127.0.0.1:3001' : TARGET_URL

const OUT_DIR = resolve('scripts/promo/remotion/public/clips')
const TMP_DIR = resolve('scripts/promo/.video-tmp')
const VIEWPORT = { width: 1920, height: 1080 } as const

const DEMO_EMAIL = 'demo@pencil-editor.app'
const DEMO_NAME = 'Demo Designer'

async function setupSession() {
  const url = new URL(`${API_URL}/api/auth/test/login`)
  url.searchParams.set('email', DEMO_EMAIL)
  url.searchParams.set('name', DEMO_NAME)
  const res = await fetch(url.toString(), { redirect: 'manual' })
  if (!res.ok) throw new Error(`test/login failed: ${res.status}`)
  const setCookies = res.headers.getSetCookie?.() ?? []
  return setCookies
    .map((line) => {
      const parts = line.split(';').map((p) => p.trim())
      const [nameValue, ...attrs] = parts
      const eqIdx = nameValue.indexOf('=')
      const name = nameValue.substring(0, eqIdx)
      const value = nameValue.substring(eqIdx + 1)
      const attrMap = Object.fromEntries(
        attrs.map((a) => {
          const idx = a.indexOf('=')
          return idx < 0
            ? [a.toLowerCase(), 'true']
            : [a.substring(0, idx).toLowerCase(), a.substring(idx + 1)]
        })
      )
      return {
        name,
        value,
        domain: 'localhost',
        path: attrMap.path || '/',
        httpOnly: 'httponly' in attrMap,
        secure: 'secure' in attrMap,
        sameSite: (attrMap.samesite as 'Lax' | 'Strict' | 'None' | undefined) ?? ('Lax' as const)
      }
    })
}

async function createBoard(cookieHeader: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/boards`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: cookieHeader
    },
    body: JSON.stringify({ name: 'Replay marketing site' })
  })
  if (!res.ok) {
    throw new Error(`createBoard failed: ${res.status} ${await res.text()}`)
  }
  const data = (await res.json()) as { id: string }
  return data.id
}

async function sleep(ms: number) {
  await new Promise<void>((res) => setTimeout(res, ms))
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })
  await rm(TMP_DIR, { recursive: true, force: true })
  await mkdir(TMP_DIR, { recursive: true })

  process.stdout.write(`🔐 test/login (demo user)...\n`)
  const cookieObjs = await setupSession()
  const cookieHeader = cookieObjs.map((c) => `${c.name}=${c.value}`).join('; ')
  process.stdout.write(`   ✓ ${cookieObjs.length} cookies\n`)

  process.stdout.write(`📋 demo board 作成...\n`)
  const boardId = await createBoard(cookieHeader)
  process.stdout.write(`   ✓ board id: ${boardId}\n`)

  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1, // 録画は 1x でファイルサイズ抑える、 Remotion 側で 1920×1080 配置
    recordVideo: { dir: TMP_DIR, size: VIEWPORT }
  })
  await ctx.addCookies(cookieObjs)

  const page = await ctx.newPage()

  // editor を開く
  process.stdout.write(`🎬 editor を開く...\n`)
  await page.goto(`${TARGET_URL}/board/${boardId}`, { waitUntil: 'networkidle', timeout: 30_000 })
  // CanvasKit-wasm + Pinia 起動を待つ
  await sleep(5_000)

  // .pen を window.inkly.openFile で読み込む
  process.stdout.write(`📂 promo-design.pen をロード...\n`)
  await page.evaluate(async () => {
    type InklyWindow = {
      inkly?: { openFile?: (path: string) => Promise<void> }
    }
    const w = window as unknown as InklyWindow
    if (w.inkly?.openFile) {
      await w.inkly.openFile('/promo-design.pen')
    }
  })
  await sleep(3_000)

  // === ここから「操作している感」 ===

  // ① マウスを canvas 中央 → 左 → 右 と動かす (カーソル風)
  process.stdout.write(`🖱️ カーソル移動...\n`)
  const cx = VIEWPORT.width / 2
  const cy = VIEWPORT.height / 2 + 40
  await page.mouse.move(cx, cy)
  await sleep(700)
  await page.mouse.move(cx - 280, cy - 120, { steps: 30 })
  await sleep(900)
  await page.mouse.move(cx + 200, cy + 80, { steps: 30 })
  await sleep(900)

  // ② canvas を click してオブジェクト選択を試みる (見た目重視、 実選択は別途)
  process.stdout.write(`🎯 オブジェクト選択...\n`)
  await page.mouse.move(cx, cy, { steps: 25 })
  await sleep(400)
  await page.mouse.click(cx, cy)
  await sleep(900)

  // ③ ズームショートカット (Cmd+0 で 100%、 + で zoom in)
  process.stdout.write(`🔍 ズーム操作...\n`)
  await page.keyboard.press('Meta+0')
  await sleep(800)
  await page.keyboard.press('Meta+=')
  await sleep(500)
  await page.keyboard.press('Meta+=')
  await sleep(700)

  // ④ ツール切替 (V→R→T 等のキーボード ショートカット)
  // pencil editor の tool shortcut は M / R / O / T / L / P / H (mover/rect/ellipse/text/line/pen/hand)
  process.stdout.write(`🛠️ ツール切替...\n`)
  await page.keyboard.press('R')
  await sleep(500)
  // 矩形を描く (drag)
  await page.mouse.move(cx - 200, cy - 80)
  await sleep(200)
  await page.mouse.down()
  await page.mouse.move(cx - 50, cy + 60, { steps: 20 })
  await sleep(150)
  await page.mouse.up()
  await sleep(700)

  // ⑤ select に戻して動かす
  await page.keyboard.press('M')
  await sleep(400)
  await page.mouse.move(cx, cy)
  await sleep(400)
  await page.mouse.down()
  await page.mouse.move(cx + 220, cy - 80, { steps: 20 })
  await sleep(200)
  await page.mouse.up()
  await sleep(900)

  // ⑥ 最後にズームアウトして全景表示
  await page.keyboard.press('Meta+0')
  await sleep(900)

  process.stdout.write(`✅ 録画完了、 ファイル保存中...\n`)
  await page.close()
  const video = await ctx.close().then(async () => {
    // recordVideo はちゃんと flush されるよう context.close() を await
  })
  void video
  await browser.close()

  // tmp の webm を編集用の名前にリネーム
  const files = await readdir(TMP_DIR)
  const webm = files.find((f) => f.endsWith('.webm'))
  if (!webm) throw new Error('no webm produced')
  const src = join(TMP_DIR, webm)
  const dest = join(OUT_DIR, 'editor-demo.webm')
  await rename(src, dest)
  const st = await stat(dest)
  process.stdout.write(`\n✅ ${dest} (${(st.size / 1024 / 1024).toFixed(1)} MB)\n`)
}

void main().catch((error) => {
  process.stderr.write(`❌ record-editor failed: ${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})
