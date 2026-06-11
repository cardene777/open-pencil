#!/usr/bin/env bun
/**
 * scripts/promo/capture.ts — local dev server から動画素材を全自動取得。
 *
 * 流れ:
 *   1. test/login で demo user (`demo@pencil-editor.app`) を作って session 確立
 *   2. demo board を 3 つ API で作成 (ダッシュボード / boards 画面を賑やかに)
 *   3. LP hero / features / dashboard / editor / share modal / outro の screenshot
 *
 * 出力: scripts/promo/remotion/public/shots/{name}.png
 */
import { chromium, type Page } from '@playwright/test'
import { mkdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const urlArgIndex = args.indexOf('--url')
const TARGET_URL =
  urlArgIndex >= 0 && args[urlArgIndex + 1] ? args[urlArgIndex + 1] : 'http://localhost:1420'
// API は :3001 (local)、 production の場合は同 origin (Hono が SPA + API を両方配信)。
// API server は 127.0.0.1:3001 で listen するので、 localhost (1420) ⇄ 127.0.0.1 (3001)。
const API_URL = TARGET_URL.includes('1420')
  ? 'http://127.0.0.1:3001'
  : TARGET_URL

const OUT_DIR = resolve('scripts/promo/remotion/public/shots')
const VIEWPORT = { width: 1920, height: 1080 } as const

const DEMO_EMAIL = 'demo@pencil-editor.app'
const DEMO_NAME = 'Demo Designer'

async function setupDemoSession(): Promise<{ cookies: string }> {
  // test/login (GET) で session cookie を取得
  const url = new URL(`${API_URL}/api/auth/test/login`)
  url.searchParams.set('email', DEMO_EMAIL)
  url.searchParams.set('name', DEMO_NAME)
  const res = await fetch(url.toString(), { redirect: 'manual' })
  if (!res.ok) {
    throw new Error(`test/login failed: ${res.status}`)
  }
  const setCookies = res.headers.getSetCookie?.() ?? []
  if (setCookies.length === 0) {
    throw new Error(`test/login: Set-Cookie が空`)
  }
  // 後で Playwright に注入する用に session cookie 行をそのまま返す
  return { cookies: setCookies.join('\n') }
}

async function createDemoBoards(cookies: string) {
  const names = ['Marketing redesign', 'Mobile app · v2', 'Onboarding flow']
  for (const name of names) {
    const res = await fetch(`${API_URL}/api/boards`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: cookies
          .split('\n')
          .map((line) => line.split(';')[0])
          .join('; ')
      },
      body: JSON.stringify({ name })
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      process.stdout.write(`  ⚠️  board "${name}" 作成失敗: ${res.status} ${text}\n`)
    } else {
      process.stdout.write(`  ✓ board "${name}" 作成\n`)
    }
  }
}

function parseSetCookies(setCookieLines: string) {
  // Playwright context に流し込める cookie object 配列に変換
  return setCookieLines
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const parts = line.split(';').map((p) => p.trim())
      const [nameValue, ...attrs] = parts
      const eqIdx = nameValue.indexOf('=')
      const name = nameValue.substring(0, eqIdx)
      const value = nameValue.substring(eqIdx + 1)
      const attrMap = Object.fromEntries(
        attrs.map((a) => {
          const idx = a.indexOf('=')
          return idx < 0 ? [a.toLowerCase(), 'true'] : [a.substring(0, idx).toLowerCase(), a.substring(idx + 1)]
        })
      )
      return {
        name,
        value,
        domain: 'localhost',
        path: attrMap.path || '/',
        httpOnly: 'httponly' in attrMap,
        secure: 'secure' in attrMap,
        sameSite:
          (attrMap.samesite as 'Lax' | 'Strict' | 'None' | undefined) ?? ('Lax' as const)
      }
    })
}

interface Shot {
  name: string
  path: string
  waitMs?: number
  beforeShot?: (page: Page) => Promise<void>
}

const shots: Shot[] = [
  {
    name: 'lp-hero',
    path: '/',
    // LP は SW + landing-active body class を待つ
    waitMs: 2_500
  },
  {
    name: 'lp-features',
    path: '/',
    waitMs: 2_000,
    beforeShot: async (page) => {
      await page.evaluate(() =>
        window.scrollTo({ top: document.body.scrollHeight * 0.5, behavior: 'auto' })
      )
      await page.waitForTimeout(800)
    }
  },
  {
    name: 'dashboard',
    path: '/dashboard',
    waitMs: 3_500
  },
  {
    name: 'editor',
    path: '/boards',
    waitMs: 2_500,
    beforeShot: async (page) => {
      const firstBoard = page.locator('a[href^="/board/"]').first()
      if (await firstBoard.count().catch(() => 0)) {
        await firstBoard.click().catch(() => undefined)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
        // CanvasKit-wasm + Pinia 初期化を十分待つ
        await page.waitForTimeout(6_000)
      }
    }
  },
  {
    name: 'share-modal',
    path: '/boards',
    waitMs: 2_500,
    beforeShot: async (page) => {
      const firstBoard = page.locator('a[href^="/board/"]').first()
      if (await firstBoard.count().catch(() => 0)) {
        await firstBoard.click().catch(() => undefined)
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => undefined)
        await page.waitForTimeout(5_000)
      }
      const shareBtn = page.locator('[data-test-id="invite-share-button"]').first()
      if (await shareBtn.count().catch(() => 0)) {
        await shareBtn.click().catch(() => undefined)
        await page.waitForTimeout(1_500)
        const emailInput = page.locator('[data-test-id="share-email-input"]')
        if (await emailInput.count().catch(() => 0)) {
          await emailInput.fill('teammate@example.com').catch(() => undefined)
          await page.waitForTimeout(600)
          const submit = page.locator('[data-test-id="share-submit"]')
          if (await submit.count().catch(() => 0)) {
            await submit.click().catch(() => undefined)
            await page.waitForTimeout(2_500)
          }
        }
      }
    }
  },
  {
    name: 'lp-outro',
    path: '/',
    waitMs: 2_500
  }
]

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  process.stdout.write(`🎯 target: ${TARGET_URL}\n`)
  process.stdout.write(`📁 output: ${OUT_DIR}\n\n`)

  process.stdout.write(`🔐 test/login で demo user を作成中...\n`)
  const { cookies: rawSetCookies } = await setupDemoSession()
  const cookieObjs = parseSetCookies(rawSetCookies)
  process.stdout.write(`   ✓ session cookies: ${cookieObjs.length}\n\n`)

  process.stdout.write(`📋 demo board を作成中...\n`)
  await createDemoBoards(rawSetCookies)
  process.stdout.write(`\n`)

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader']
  })
  try {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 2
    })
    await ctx.addCookies(cookieObjs)
    const page = await ctx.newPage()

    for (const shot of shots) {
      process.stdout.write(`📸 ${shot.name} (${shot.path})...`)
      await page.goto(`${TARGET_URL}${shot.path}`, {
        waitUntil: 'networkidle',
        timeout: 30_000
      })
      await page.waitForTimeout(shot.waitMs ?? 2_500)
      if (shot.beforeShot) {
        await shot.beforeShot(page)
        await page.waitForTimeout(500)
      }
      const filePath = `${OUT_DIR}/${shot.name}.png`
      await page.screenshot({ path: filePath, fullPage: false })
      process.stdout.write(` ✓\n`)
    }

    await ctx.close()
  } finally {
    await browser.close()
  }

  process.stdout.write(`\n✅ ${shots.length} 枚撮影完了\n`)
}

void main().catch((error) => {
  process.stderr.write(`❌ capture failed: ${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})
