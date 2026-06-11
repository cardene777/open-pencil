#!/usr/bin/env bun
/**
 * scripts/promo/record-flow.ts — Linear / Granola 風 全自動フロー録画。
 *
 * 設計:
 *   - 録画前に既存 demo board を全削除 + 1 ボードだけ作る (毎回クリーン)
 *   - 操作は速い (cursor 移動 200ms、 待機 600ms)
 *   - .pen は「ドラッグ&ドロップ風」演出 → window.inkly.openFile で実 load
 *   - 1 = Zoom to fit でデザインを画面いっぱいに表示
 *
 * 出力: scripts/promo/remotion/public/clips/flow.webm
 *
 * 流れ (シーン時刻):
 *   [0:00-0:03] dashboard
 *   [0:03-0:07] 新規ボード button click → editor 遷移
 *   [0:07-0:09] editor 起動完了
 *   [0:09-0:14] .pen を canvas にドラッグ&ドロップ風アニメ → デザイン load + zoom-fit
 *   [0:14-0:18] オブジェクト操作 (ズーム + ツール切替)
 *   [0:18-0:24] 共有モーダル → 招待発行 → コピー
 */
import { chromium, type Page } from '@playwright/test'
import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { PromoInklyWindow } from './inkly-types'

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
const CURSOR_MS = 220

async function setupSession() {
  const url = new URL(`${API_URL}/api/auth/test/login`)
  url.searchParams.set('email', DEMO_EMAIL)
  url.searchParams.set('name', DEMO_NAME)
  const res = await fetch(url.toString(), { redirect: 'manual' })
  if (!res.ok) throw new Error(`test/login failed: ${res.status}`)
  const setCookies = res.headers.getSetCookie?.() ?? []
  return setCookies.map((line) => {
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

/**
 * 既存の demo board を全削除し、 demo 用の 1 ボードだけ残す。
 * 録画毎にダッシュボードがクリーンな状態 (1 ボードのみ) になる。
 */
async function resetWorkspace(cookieHeader: string) {
  // 既存 board 一覧取得
  const listRes = await fetch(`${API_URL}/api/boards`, {
    headers: { cookie: cookieHeader }
  })
  if (listRes.ok) {
    const list = (await listRes.json()) as { boards?: Array<{ id: string }> } | Array<{ id: string }>
    const boards = Array.isArray(list) ? list : (list.boards ?? [])
    for (const b of boards) {
      await fetch(`${API_URL}/api/boards/${b.id}`, {
        method: 'DELETE',
        headers: { cookie: cookieHeader }
      }).catch(() => undefined)
    }
  }
}

async function sleep(ms: number) {
  await new Promise<void>((res) => setTimeout(res, ms))
}

async function injectCursorOverlay(page: Page, cursorMs: number) {
  await page.addStyleTag({
    content: `
      /* OS の実カーソルを完全に隠す (Playwright が描画する黒い矢印を抑止)。
         私が inject した白いポインタ (__promo-cursor) のみ画面に映る。 */
      *, *::before, *::after { cursor: none !important; }
      html, body { cursor: none !important; }
      .__promo-cursor {
        position: fixed;
        top: 0; left: 0;
        width: 32px; height: 32px;
        pointer-events: none;
        z-index: 2147483646;
        transition: transform ${cursorMs}ms cubic-bezier(0.25, 0.1, 0.25, 1.0);
        will-change: transform;
      }
      .__promo-cursor svg { width: 100%; height: 100%; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.45)); }
      .__promo-ripple {
        position: fixed;
        pointer-events: none;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(124,140,255,0.6), rgba(124,140,255,0));
        width: 80px; height: 80px;
        transform: translate(-50%, -50%) scale(0);
        z-index: 2147483645;
        animation: __promo-ripple 520ms ease-out forwards;
      }
      @keyframes __promo-ripple {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0.85; }
        100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
      }
      .__promo-glow {
        position: absolute;
        pointer-events: none;
        border-radius: 12px;
        z-index: 2147483644;
        box-shadow:
          0 0 0 2.5px rgba(124, 140, 255, 0.95),
          0 0 0 7px rgba(124, 140, 255, 0.28),
          0 0 38px rgba(124, 140, 255, 0.5);
        transition: all 220ms cubic-bezier(0.25, 0.1, 0.25, 1.0);
      }
      .__promo-drag-card {
        position: fixed;
        pointer-events: none;
        z-index: 2147483646;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 22px 14px 16px;
        background: linear-gradient(135deg, rgba(20,24,34,0.95) 0%, rgba(28,32,46,0.95) 100%);
        border: 1px solid rgba(124,140,255,0.45);
        border-radius: 14px;
        box-shadow:
          0 18px 50px rgba(0,0,0,0.55),
          0 0 0 1px rgba(255,255,255,0.04),
          0 0 60px rgba(124,140,255,0.35);
        backdrop-filter: blur(20px);
        transform: translate(-50%, -50%) scale(0.94);
        opacity: 0;
        transition: transform 280ms cubic-bezier(0.25, 0.1, 0.25, 1.0),
                    opacity 260ms ease,
                    left 1100ms cubic-bezier(0.25, 0.1, 0.25, 1.0),
                    top 1100ms cubic-bezier(0.25, 0.1, 0.25, 1.0);
        font-family: "Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif;
        color: #f5f6f7;
      }
      .__promo-drag-card.visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      .__promo-drag-card .icon {
        width: 38px; height: 38px;
        border-radius: 10px;
        background: linear-gradient(135deg, #7c8cff 0%, #b08cff 100%);
        display: flex; align-items: center; justify-content: center;
        color: #0d1017; font-weight: 700; font-size: 12px;
        letter-spacing: 0.04em;
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
      .__promo-drag-card .meta { display: flex; flex-direction: column; gap: 2px; }
      .__promo-drag-card .name { font-size: 14px; font-weight: 600; }
      .__promo-drag-card .size { font-size: 11px; color: rgba(232,234,237,0.55); }
      .__promo-drop-zone {
        position: fixed;
        pointer-events: none;
        z-index: 2147483643;
        border: 2.5px dashed rgba(124,140,255,0.85);
        border-radius: 18px;
        background: rgba(124,140,255,0.08);
        opacity: 0;
        transition: opacity 280ms ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .__promo-drop-zone.visible { opacity: 1; }
      .__promo-drop-zone .label {
        padding: 12px 24px;
        background: rgba(13,16,23,0.8);
        border: 1px solid rgba(124,140,255,0.5);
        border-radius: 12px;
        font-size: 18px;
        color: rgba(232,234,237,0.85);
        font-weight: 500;
        font-family: "Inter", "Hiragino Sans", -apple-system, sans-serif;
        backdrop-filter: blur(12px);
      }
    `
  })

  await page.evaluate(() => {
    // 過去 inject 残骸を全削除 (page reload や 2 度目 inject による重複防止)
    document
      .querySelectorAll('.__promo-cursor, .__promo-drag-card, .__promo-drop-zone, .__promo-glow, .__promo-ripple')
      .forEach((el) => el.remove())

    const cur = document.createElement('div')
    cur.className = '__promo-cursor'
    cur.innerHTML = `
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 4 L26 16 L17 17 L21 27 L18 28 L14 18 L6 24 Z"
              fill="#ffffff" stroke="#0d1017" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `
    document.body.appendChild(cur)

    interface PromoWindow extends Window {
      __promoCursorMove?: (x: number, y: number) => void
      __promoRipple?: (x: number, y: number) => void
      __promoGlow?: (selector: string | null) => void
      __promoDragCardShow?: (name: string, size: string, x: number, y: number) => void
      __promoDragCardMove?: (x: number, y: number) => void
      __promoDragCardHide?: () => void
      __promoDropZoneShow?: (x: number, y: number, w: number, h: number) => void
      __promoDropZoneHide?: () => void
    }
    const w = window as PromoWindow

    w.__promoCursorMove = (x, y) => {
      cur.style.transform = `translate(${x - 4}px, ${y - 4}px)`
    }

    w.__promoRipple = (x, y) => {
      const r = document.createElement('div')
      r.className = '__promo-ripple'
      r.style.left = `${x}px`
      r.style.top = `${y}px`
      document.body.appendChild(r)
      setTimeout(() => r.remove(), 620)
    }

    let glow: HTMLDivElement | null = null
    w.__promoGlow = (selector) => {
      glow?.remove()
      glow = null
      if (!selector) return
      const target = document.querySelector(selector) as HTMLElement | null
      if (!target) return
      const rect = target.getBoundingClientRect()
      const g = document.createElement('div')
      g.className = '__promo-glow'
      g.style.left = `${rect.left - 6}px`
      g.style.top = `${rect.top - 6}px`
      g.style.width = `${rect.width + 12}px`
      g.style.height = `${rect.height + 12}px`
      document.body.appendChild(g)
      glow = g
    }

    let dragCard: HTMLDivElement | null = null
    w.__promoDragCardShow = (name, size, x, y) => {
      dragCard?.remove()
      const d = document.createElement('div')
      d.className = '__promo-drag-card'
      d.innerHTML = `
        <div class="icon">.pen</div>
        <div class="meta">
          <div class="name">${name}</div>
          <div class="size">${size}</div>
        </div>
      `
      d.style.left = `${x}px`
      d.style.top = `${y}px`
      document.body.appendChild(d)
      dragCard = d
      requestAnimationFrame(() => d.classList.add('visible'))
    }
    w.__promoDragCardMove = (x, y) => {
      if (!dragCard) return
      dragCard.style.left = `${x}px`
      dragCard.style.top = `${y}px`
    }
    w.__promoDragCardHide = () => {
      if (!dragCard) return
      dragCard.classList.remove('visible')
      const target = dragCard
      setTimeout(() => target.remove(), 300)
      dragCard = null
    }

    let dropZone: HTMLDivElement | null = null
    w.__promoDropZoneShow = (x, y, dw, dh) => {
      dropZone?.remove()
      const d = document.createElement('div')
      d.className = '__promo-drop-zone'
      d.style.left = `${x}px`
      d.style.top = `${y}px`
      d.style.width = `${dw}px`
      d.style.height = `${dh}px`
      d.innerHTML = `<div class="label">ここにドロップして開く</div>`
      document.body.appendChild(d)
      dropZone = d
      requestAnimationFrame(() => d.classList.add('visible'))
    }
    w.__promoDropZoneHide = () => {
      if (!dropZone) return
      dropZone.classList.remove('visible')
      const target = dropZone
      setTimeout(() => target.remove(), 300)
      dropZone = null
    }

    w.__promoCursorMove(window.innerWidth / 2, window.innerHeight / 2)
  })
}

async function moveCursor(page: Page, x: number, y: number) {
  await page.evaluate(
    ([px, py]) => {
      interface W extends Window {
        __promoCursorMove?: (x: number, y: number) => void
      }
      ;(window as W).__promoCursorMove?.(px, py)
    },
    [x, y]
  )
  await page.mouse.move(x, y, { steps: 12 })
}

async function clickWithCursor(page: Page, selector: string) {
  const handle = page.locator(selector).first()
  await handle.waitFor({ state: 'visible', timeout: 10_000 })
  const box = await handle.boundingBox()
  if (!box) throw new Error(`no bbox for ${selector}`)
  const cx = Math.round(box.x + box.width / 2)
  const cy = Math.round(box.y + box.height / 2)

  await moveCursor(page, cx, cy)
  await sleep(350)

  await page.evaluate(
    (s) => {
      interface W extends Window {
        __promoGlow?: (selector: string | null) => void
      }
      ;(window as W).__promoGlow?.(s)
    },
    selector
  )
  await sleep(420)

  await page.evaluate(
    ([px, py]) => {
      interface W extends Window {
        __promoRipple?: (x: number, y: number) => void
      }
      ;(window as W).__promoRipple?.(px, py)
    },
    [cx, cy]
  )
  await sleep(120)
  await handle.click({ force: true }).catch(() => undefined)
  await sleep(400)

  await page.evaluate(() => {
    interface W extends Window {
      __promoGlow?: (selector: string | null) => void
    }
    ;(window as W).__promoGlow?.(null)
  })
}

interface DnDSpec {
  name: string
  size: string
  serverPath: string
}

/**
 * DnD カードが画面右下から canvas 中央に滑り込み、 波紋 → 実 load まで。
 */
async function performDnD(
  page: Page,
  cbox: { x: number; y: number; width: number; height: number } | null,
  spec: DnDSpec
) {
  const startX = 1700
  const startY = 940
  await page.evaluate(
    ({ name, size, x, y }) => {
      interface W extends Window {
        __promoDragCardShow?: (name: string, size: string, x: number, y: number) => void
      }
      ;(window as W).__promoDragCardShow?.(name, size, x, y)
    },
    { name: spec.name, size: spec.size, x: startX, y: startY }
  )
  await moveCursor(page, startX, startY)
  await sleep(700)

  if (cbox) {
    const dz = { x: cbox.x + 80, y: cbox.y + 80, w: cbox.width - 160, h: cbox.height - 160 }
    await page.evaluate(
      ([x, y, w, h]) => {
        interface W extends Window {
          __promoDropZoneShow?: (x: number, y: number, w: number, h: number) => void
        }
        ;(window as W).__promoDropZoneShow?.(x, y, w, h)
      },
      [dz.x, dz.y, dz.w, dz.h]
    )
  }
  await sleep(280)

  const centerX = cbox ? cbox.x + cbox.width / 2 : 960
  const centerY = cbox ? cbox.y + cbox.height / 2 : 540
  await page.evaluate(
    ([x, y]) => {
      interface W extends Window {
        __promoDragCardMove?: (x: number, y: number) => void
      }
      ;(window as W).__promoDragCardMove?.(x, y)
    },
    [centerX, centerY]
  )
  await moveCursor(page, centerX, centerY)
  await sleep(1_200)

  await page.evaluate(
    ([x, y]) => {
      interface W extends Window {
        __promoRipple?: (x: number, y: number) => void
        __promoDragCardHide?: () => void
        __promoDropZoneHide?: () => void
      }
      const w = window as W
      w.__promoRipple?.(x, y)
      w.__promoDragCardHide?.()
      w.__promoDropZoneHide?.()
    },
    [centerX, centerY]
  )
  await sleep(420)

  await page.evaluate(async (path) => {
    const w = window as PromoInklyWindow
    try {
      await w.inkly?.openFile?.(path)
    } catch (e) {
      console.warn('openFile threw:', e)
    }
  }, spec.serverPath)
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })
  await rm(TMP_DIR, { recursive: true, force: true })
  await mkdir(TMP_DIR, { recursive: true })

  process.stdout.write(`🔐 test/login...\n`)
  const cookieObjs = await setupSession()
  const cookieHeader = cookieObjs.map((c) => `${c.name}=${c.value}`).join('; ')
  process.stdout.write(`🧹 workspace reset (delete all existing boards)...\n`)
  await resetWorkspace(cookieHeader)

  // CanvasKit-WebGPU を headless で動かすため SwiftShader を明示的に有効化
  // (playwright.config.ts の inkly project と同じ設定)
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader']
  })
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP_DIR, size: VIEWPORT }
  })
  await ctx.addCookies(cookieObjs)
  const page = await ctx.newPage()

  page.on('console', (msg) => {
    const t = msg.type()
    if (t === 'warning' || t === 'error') {
      process.stdout.write(`  [page-${t}] ${msg.text()}\n`)
    }
  })

  const t0 = Date.now()
  const mark = (label: string) =>
    process.stdout.write(`⏱ ${((Date.now() - t0) / 1000).toFixed(2)}s : ${label}\n`)

  // ============ 0-1s: ダッシュボード (テンポ up) ============
  mark('navigate /dashboard')
  await page.goto(`${TARGET_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30_000 })
  await sleep(500)
  await injectCursorOverlay(page, CURSOR_MS)
  await moveCursor(page, 1500, 200)
  await sleep(220)

  // ============ 新規ボード button → click → エディタ遷移 ============
  mark('click new board button')
  await clickWithCursor(page, '[data-test-id="dashboard-create-board"]')
  await page.waitForURL(/\/board\//, { timeout: 15_000 }).catch(() => undefined)

  // ============ editor 起動完了待ち ============
  mark('wait CanvasKit + editor mount')
  await sleep(2_000)
  await injectCursorOverlay(page, CURSOR_MS)

  // ============ DnD: replay-marketing.fig を 1 回だけ ============
  mark('drag-and-drop .fig')
  const canvas = page.locator('[data-test-id="scene-canvas-element"]').first()
  const cbox = await canvas.boundingBox().catch(() => null)

  await performDnD(page, cbox, {
    name: 'replay-marketing.fig',
    size: '68 KB · Figma ファイル',
    serverPath: '/promo-design.fig'
  })
  await sleep(1_400)

  // zoomToFit で全景表示
  await page.evaluate(() => {
    const w = window as PromoInklyWindow
    const s = w.inkly?.getStore?.()
    s?.clearSelection?.()
    s?.zoomToFit?.()
  })
  await sleep(700)

  // .fig 鑑賞 (短く、 0.9 秒)
  await moveCursor(page, 1880, 1060)
  await sleep(900)

  // ============ 編集操作セクション = Screen 全体の背景色変更 ============
  // 1) Inspector / Layers panel を一時 hide、 viewport を画面いっぱいに
  // 2) Screen 全体を select → 画面の左右上下中央に配置
  // 3) Screen の fills を brand purple に変更、 画面全体が紫色に
  // 4) 1.4 秒見せる → undo + panel 復帰
  mark('edit interactions (Screen-wide center color change)')

  // 1) Inspector / Layers panel を CSS で hide、 viewport を画面いっぱいに広げる
  await page.addStyleTag({
    content: `
      [data-panel-id="layers"],
      [data-panel-id="properties"],
      [data-resize-handle] {
        display: none !important;
      }
      [data-panel-id="canvas"] {
        flex-basis: 100% !important;
        flex-grow: 1 !important;
        max-width: 100% !important;
      }
    `
  })
  await sleep(220) // panel 消滅 + layout 反映待ち

  // 2) Screen を画面 (viewport) の左右上下中央に配置
  await page.evaluate(() => {
    const w = window as PromoInklyWindow
    try {
      const store = w.inkly?.getStore?.()
      if (!store) return
      const pageId = store.state?.currentPageId
      if (!pageId) return
      const kids = store.getChildren?.(pageId) ?? []
      const screenChild = kids.find((k) => k.type === 'FRAME')
      if (!screenChild) return
      store.select?.([screenChild.id])

      // EditorCanvas の bounding box を取得 = panel hide 後の実 viewport
      const canvasEl = document.querySelector(
        '[data-test-id="scene-canvas-element"]'
      ) as HTMLElement | null
      if (!canvasEl) return
      const rect = canvasEl.getBoundingClientRect()
      const viewW = rect.width
      const viewH = rect.height

      const node = store.graph?.getNode?.(screenChild.id) ?? screenChild
      const sx = node.x ?? 0
      const sy = node.y ?? 0
      const sw = node.width ?? 1440
      const sh = node.height ?? 1400

      // padding 100 で fit zoom、 Screen が画面全体に収まる
      const pad = 100
      const zoom = Math.min((viewW - pad * 2) / sw, (viewH - pad * 2) / sh, 1)
      if (store.state) {
        store.state.zoom = zoom
        store.state.panX = viewW / 2 - (sx + sw / 2) * zoom
        store.state.panY = viewH / 2 - (sy + sh / 2) * zoom
      }
      store.requestRepaint?.()
    } catch (e) {
      console.warn('center zoom threw:', e)
    }
  })
  await sleep(600)

  // 2) Screen 全体の fills を brand purple に → 画面全体が紫色になる
  await page.evaluate(() => {
    const w = window as PromoInklyWindow
    try {
      const store = w.inkly?.getStore?.()
      if (!store) return
      const pageId = store.state?.currentPageId
      if (!pageId) return
      const kids = store.getChildren?.(pageId) ?? []
      const screen = kids.find((k) => k.type === 'FRAME')
      if (!screen) return
      store.select?.([screen.id])
      store.graph?.updateNode?.(screen.id, {
        fills: [
          {
            type: 'SOLID',
            color: { r: 0.486, g: 0.549, b: 1, a: 1 },
            opacity: 1,
            visible: true,
            blendMode: 'NORMAL'
          }
        ]
      })
      store.requestRepaint?.()
    } catch (e) {
      console.warn('color change threw:', e)
    }
  })
  await sleep(1_300)

  // 3) 元に戻す → panel 復帰
  await page.keyboard.press('Meta+z')
  await sleep(450)

  // panel 復帰 (CSS 削除)
  await page.evaluate(() => {
    const styles = Array.from(document.querySelectorAll('style'))
    for (const s of styles) {
      if (s.textContent?.includes('data-panel-id="layers"')) {
        s.remove()
      }
    }
  })
  await sleep(280)

  // カーソル退避
  await moveCursor(page, 1880, 1060)
  await sleep(280)

  // ============ 共有モーダル (テンポ up、 約 10 秒) ============
  mark('share flow')
  const shareSel = '[data-test-id="invite-share-button"]'
  const shareBtnCount = await page.locator(shareSel).count().catch(() => 0)
  if (shareBtnCount > 0) {
    await page.locator(shareSel).first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined)
    const shareBox = await page.locator(shareSel).first().boundingBox().catch(() => null)
    if (shareBox) {
      await moveCursor(page, shareBox.x + shareBox.width / 2, shareBox.y + shareBox.height / 2)
      await sleep(280)
    }
    await clickWithCursor(page, shareSel)
    await page
      .locator('[data-test-id="share-modal"]')
      .waitFor({ state: 'visible', timeout: 5_000 })
      .catch(() => undefined)
    await sleep(1_100)

    const emailSel = '[data-test-id="share-email-input"]'
    const emailCount = await page.locator(emailSel).count().catch(() => 0)
    if (emailCount > 0) {
      const box = await page.locator(emailSel).boundingBox()
      if (box) {
        await moveCursor(page, box.x + box.width / 2, box.y + box.height / 2)
        await sleep(280)
        await page.locator(emailSel).pressSequentially('teammate@example.com', { delay: 40 })
        await sleep(500)
      }
      await clickWithCursor(page, '[data-test-id="share-submit"]')
      await page
        .locator('[data-test-id="share-copy-link"]')
        .waitFor({ state: 'visible', timeout: 6_000 })
        .catch(() => undefined)
      await sleep(1_700)

      const copySel = '[data-test-id="share-copy-link"]'
      if (await page.locator(copySel).count().catch(() => 0)) {
        const cBox = await page.locator(copySel).boundingBox().catch(() => null)
        if (cBox) {
          await moveCursor(page, cBox.x + cBox.width / 2, cBox.y + cBox.height / 2)
          await sleep(220)
        }
        await clickWithCursor(page, copySel)
        await sleep(1_700)
      }
      await moveCursor(page, 1880, 1060)
      await sleep(1_400)
    }
  }

  mark('done')
  await sleep(350)

  process.stdout.write(`\n🎬 録画 close...\n`)
  await page.close()
  await ctx.close()
  await browser.close()

  const files = await readdir(TMP_DIR)
  const webm = files.find((f) => f.endsWith('.webm'))
  if (!webm) throw new Error('no webm produced')
  const src = join(TMP_DIR, webm)
  const dest = join(OUT_DIR, 'flow.webm')
  await rename(src, dest)
  const st = await stat(dest)
  process.stdout.write(`\n✅ ${dest} (${(st.size / 1024 / 1024).toFixed(1)} MB)\n`)
}

void main().catch((error) => {
  process.stderr.write(`❌ record-flow failed: ${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})
