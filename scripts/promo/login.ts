#!/usr/bin/env bun
/**
 * scripts/promo/login.ts — Playwright で 1 度だけ手動ログインして
 * storageState (cookie 等) を保存する。 以降の capture.ts はこれを読んで
 * ログイン済 state で screenshot を取得する。
 *
 * 使い方:
 *   bun scripts/promo/login.ts
 *
 * ブラウザが headed (画面付き) で起動する → Google ログインを画面で実施
 *   → ターミナルで Enter キーを押す → state file 保存
 */
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const TARGET_URL = 'https://pencil-editor.fly.dev'
const STORAGE_STATE = resolve('scripts/promo/.playwright-state.json')

async function main() {
  await mkdir(dirname(STORAGE_STATE), { recursive: true })
  process.stdout.write(`🌐 ${TARGET_URL} を headed Chromium で開きます\n`)
  process.stdout.write(`   → ブラウザで Google ログインを完了させてください\n`)
  process.stdout.write(
    `   → ログイン後、 ダッシュボード or boards が見える状態になったら ENTER を押して state を保存\n\n`
  )

  const browser = await chromium.launch({ headless: false })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const page = await ctx.newPage()
  await page.goto(TARGET_URL)

  // ターミナルで ENTER 待ち
  await new Promise<void>((res) => {
    process.stdin.setRawMode?.(true)
    process.stdin.resume()
    process.stdin.once('data', () => {
      process.stdin.setRawMode?.(false)
      process.stdin.pause()
      res()
    })
  })

  // ログイン済みか検証 (cookie + /api/auth/session で 200 が返るか)
  const cookies = await ctx.cookies()
  const sessionCookies = cookies.filter(
    (c) => c.name.includes('better-auth') || c.name.includes('session')
  )
  process.stdout.write(`\n🔍 cookie 検証: ${cookies.length} 件 (うち session 関連 ${sessionCookies.length} 件)\n`)
  for (const c of sessionCookies) {
    process.stdout.write(`   - ${c.name} (${c.domain}, httpOnly=${c.httpOnly})\n`)
  }

  // /api/auth/session を叩いて状態確認
  const sessionResp = await page.evaluate(async () => {
    const r = await fetch('/api/auth/session', { credentials: 'include' })
    return { status: r.status, ok: r.ok }
  })
  process.stdout.write(`🔍 /api/auth/session → status ${sessionResp.status}\n`)
  if (sessionResp.status !== 200) {
    process.stdout.write(
      `❌ session が認証されていません (200 が期待値)。 ブラウザで Google ログインを完了させてから再実行してください。\n`
    )
    await browser.close()
    process.exit(1)
  }

  if (sessionCookies.length === 0) {
    process.stdout.write(
      `⚠️  session cookie が cookie store に無い (但し /api/auth/session は 200)、 state file が空になる可能性あり\n`
    )
  }

  await ctx.storageState({ path: STORAGE_STATE })
  process.stdout.write(`\n✅ state を保存: ${STORAGE_STATE}\n`)

  // 保存後の検証
  const fs = await import('node:fs/promises')
  const saved = JSON.parse(await fs.readFile(STORAGE_STATE, 'utf-8'))
  process.stdout.write(
    `   saved cookies: ${saved.cookies?.length ?? 0}, origins: ${saved.origins?.length ?? 0}\n`
  )
  if ((saved.cookies?.length ?? 0) === 0) {
    process.stdout.write(
      `⚠️  保存された cookie 数が 0、 capture.ts が認証 state を使えません\n`
    )
  }
  await browser.close()
}

void main().catch((error) => {
  process.stderr.write(`❌ login failed: ${error instanceof Error ? error.stack : String(error)}\n`)
  process.exit(1)
})
