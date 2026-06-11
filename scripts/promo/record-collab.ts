#!/usr/bin/env bun
/**
 * scripts/promo/record-collab.ts — 共同編集シーンを録画する。
 *
 * 流れ:
 *   1. demo user 1 でログイン + board 作成 + 招待 token 発行
 *   2. headless Chromium A で board を開いてデザインを load (録画開始)
 *   3. headless Chromium B (別 context、 デモユーザー 2) で同 board に参加
 *   4. A の画面に「相手のカーソルが入ってきた」演出を見せる
 *   5. A 側のカーソルと B 側のカーソルが同時に canvas 上を別経路で動く
 *   6. 約 7 秒録画 → webm 保存
 *
 * 出力: scripts/promo/remotion/public/clips/collab.webm
 */
import { chromium, type Page } from '@playwright/test'
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const urlArgIndex = args.indexOf('--url')
const TARGET_URL =
  urlArgIndex >= 0 && args[urlArgIndex + 1] ? args[urlArgIndex + 1] : 'http://localhost:1420'
const API_URL = TARGET_URL.includes('1420') ? 'http://127.0.0.1:3001' : TARGET_URL

const OUT_DIR = resolve('scripts/promo/remotion/public/clips')
const TMP_DIR = resolve('scripts/promo/.collab-tmp')
const VIEWPORT = { width: 1920, height: 1080 } as const

async function loginAs(email: string, name: string) {
  const url = new URL(`${API_URL}/api/auth/test/login`)
  url.searchParams.set('email', email)
  url.searchParams.set('name', name)
  const res = await fetch(url.toString(), { redirect: 'manual' })
  if (!res.ok) throw new Error(`test/login failed: ${res.status}`)
  const setCookies = res.headers.getSetCookie?.() ?? []
  return setCookies.map((line) => {
    const parts = line.split(';').map((p) => p.trim())
    const [nv, ...attrs] = parts
    const eq = nv.indexOf('=')
    const map = Object.fromEntries(
      attrs.map((a) => {
        const idx = a.indexOf('=')
        return idx < 0
          ? [a.toLowerCase(), 'true']
          : [a.substring(0, idx).toLowerCase(), a.substring(idx + 1)]
      })
    )
    return {
      name: nv.substring(0, eq),
      value: nv.substring(eq + 1),
      domain: 'localhost',
      path: map.path || '/',
      httpOnly: 'httponly' in map,
      secure: 'secure' in map,
      sameSite: (map.samesite as 'Lax' | 'Strict' | 'None' | undefined) ?? ('Lax' as const)
    }
  })
}

async function sleep(ms: number) {
  await new Promise<void>((res) => setTimeout(res, ms))
}

async function injectCursor(page: Page, label: string, color: string) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after { cursor: none !important; }
      html, body { cursor: none !important; }
      .__cursor-${label} {
        position: fixed;
        top: 0; left: 0;
        width: 38px; height: 50px;
        pointer-events: none;
        z-index: 2147483646;
        transition: transform 240ms cubic-bezier(0.25, 0.1, 0.25, 1.0);
        will-change: transform;
      }
      .__cursor-${label} .pointer { filter: drop-shadow(0 4px 12px rgba(0,0,0,0.45)); }
      .__cursor-${label} .label {
        position: absolute;
        top: 26px; left: 18px;
        padding: 5px 12px;
        background: ${color};
        color: #0d1017;
        font-size: 13px;
        font-weight: 700;
        border-radius: 8px;
        white-space: nowrap;
        font-family: "Inter", "Hiragino Sans", -apple-system, sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      }
    `
  })
  await page.evaluate(
    ({ label, color }) => {
      document.querySelectorAll(`.__cursor-${label}`).forEach((el) => el.remove())
      const cur = document.createElement('div')
      cur.className = `__cursor-${label}`
      cur.innerHTML = `
        <svg class="pointer" viewBox="0 0 32 32" width="22" height="22" fill="none">
          <path d="M6 4 L26 16 L17 17 L21 27 L18 28 L14 18 L6 24 Z"
                fill="${color}" stroke="#0d1017" stroke-width="2" stroke-linejoin="round"/>
        </svg>
        <div class="label">${label}</div>
      `
      document.body.appendChild(cur)
      interface W extends Window {
        [k: string]: ((x: number, y: number) => void) | unknown
      }
      ;(window as W)[`__cursorMove_${label}`] = (x: number, y: number) => {
        cur.style.transform = `translate(${x - 5}px, ${y - 5}px)`
      }
      ;(window as W)[`__cursorMove_${label}`]?.(window.innerWidth / 2, window.innerHeight / 2)
    },
    { label, color }
  )
}

async function moveCursor(page: Page, label: string, x: number, y: number) {
  await page.evaluate(
    ({ label, x, y }) => {
      interface W extends Window {
        [k: string]: ((x: number, y: number) => void) | unknown
      }
      const fn = (window as W)[`__cursorMove_${label}`] as ((x: number, y: number) => void) | undefined
      fn?.(x, y)
    },
    { label, x, y }
  )
  await page.mouse.move(x, y, { steps: 10 })
}

async function main() {
  await rm(TMP_DIR, { recursive: true, force: true })
  await mkdir(TMP_DIR, { recursive: true })
  await mkdir(OUT_DIR, { recursive: true })

  process.stdout.write('🔐 owner login...\n')
  const ownerCookies = await loginAs('demo@pencil-editor.app', 'Demo Designer')
  const ownerCookieHeader = ownerCookies.map((c) => `${c.name}=${c.value}`).join('; ')

  process.stdout.write('📋 board create...\n')
  const bres = await fetch(`${API_URL}/api/boards`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: ownerCookieHeader },
    body: JSON.stringify({ name: 'Replay marketing' })
  })
  const board = (await bres.json()) as { id: string }

  process.stdout.write('✉️ invite token...\n')
  const ires = await fetch(`${API_URL}/api/invite`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: ownerCookieHeader },
    body: JSON.stringify({ boardId: board.id, email: 'teammate@example.com', role: 'editor' })
  })
  const inviteRes = (await ires.json()) as { token: string }
  const inviteUrl = `${TARGET_URL}/invite/${inviteRes.token}`
  process.stdout.write(`   url: ${inviteUrl}\n`)

  process.stdout.write('🧑 teammate login...\n')
  const teammateCookies = await loginAs('teammate@pencil-editor.app', 'Teammate')

  process.stdout.write('🌐 launch browsers (Swift Shader 有効)...\n')
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader']
  })

  // Owner、 録画あり
  const ownerCtx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP_DIR, size: VIEWPORT }
  })
  await ownerCtx.addCookies(ownerCookies)
  const ownerPage = await ownerCtx.newPage()
  await ownerPage.goto(`${TARGET_URL}/board/${board.id}`, { waitUntil: 'networkidle' })
  await sleep(4500)
  await ownerPage.evaluate(async () => {
    interface W extends Window {
      inkly?: { openFile?: (path: string) => Promise<void> }
    }
    try {
      await (window as W).inkly?.openFile?.('/promo-design.fig')
    } catch (e) {
      console.warn('owner openFile threw:', e)
    }
  })
  await sleep(2200)
  await ownerPage.evaluate(() => {
    interface W extends Window {
      inkly?: { getStore?: () => { zoomToFit?: () => void; clearSelection?: () => void } }
    }
    const w = window as W
    w.inkly?.getStore?.()?.clearSelection?.()
    w.inkly?.getStore?.()?.zoomToFit?.()
  })
  await sleep(800)
  await injectCursor(ownerPage, 'Owner', '#7c8cff')
  await moveCursor(ownerPage, 'Owner', 760, 540)

  // teammate、 1.2 秒後に参加 (owner 録画には teammate のカーソルが入ってこない、
  // ただし WebRTC 同期で owner 画面に相手のカーソルが描画される)
  await sleep(1200)
  process.stdout.write('🧑‍🤝‍🧑 teammate joins...\n')
  const teamCtx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  await teamCtx.addCookies(teammateCookies)
  const teamPage = await teamCtx.newPage()
  await teamPage.goto(inviteUrl, { waitUntil: 'networkidle' })
  await sleep(5500)
  // 招待先の board に着地後、 teammate 側でも .fig を load して同じデザインを見せる
  await teamPage.evaluate(async () => {
    interface W extends Window {
      inkly?: {
        openFile?: (path: string) => Promise<void>
        getStore?: () => { zoomToFit?: () => void; clearSelection?: () => void }
      }
    }
    try {
      const w = window as W
      await w.inkly?.openFile?.('/promo-design.fig')
      await new Promise((r) => setTimeout(r, 1500))
      const s = w.inkly?.getStore?.()
      s?.clearSelection?.()
      s?.zoomToFit?.()
    } catch (e) {
      console.warn('teammate openFile threw:', e)
    }
  })
  await sleep(1200)
  await injectCursor(teamPage, 'Teammate', '#ffb08c')

  // 両者を 5 秒間、 別経路で同時に動かす
  const t0 = Date.now()
  while (Date.now() - t0 < 5500) {
    const t = (Date.now() - t0) / 1000
    const ox = 760 + Math.sin(t * 1.3) * 240
    const oy = 540 + Math.cos(t * 1.1) * 160
    const tx = 1100 + Math.sin(t * 1.6 + 1.2) * 220
    const ty = 620 + Math.cos(t * 1.4 + 0.8) * 140
    await Promise.all([
      moveCursor(ownerPage, 'Owner', ox, oy),
      moveCursor(teamPage, 'Teammate', tx, ty)
    ])
    await sleep(220)
  }

  // 静止 1 秒
  await sleep(1000)

  process.stdout.write('🎬 close...\n')
  await ownerPage.close()
  await ownerCtx.close()
  await teamPage.close()
  await teamCtx.close()
  await browser.close()

  const files = await readdir(TMP_DIR)
  const webm = files.find((f) => f.endsWith('.webm'))
  if (!webm) throw new Error('no webm produced')
  const src = join(TMP_DIR, webm)
  const dest = join(OUT_DIR, 'collab.webm')
  await rename(src, dest)
  const st = await stat(dest)
  process.stdout.write(`\n✅ ${dest} (${(st.size / 1024 / 1024).toFixed(1)} MB)\n`)
}

void main().catch((error) => {
  process.stderr.write(`❌ record-collab failed: ${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})
