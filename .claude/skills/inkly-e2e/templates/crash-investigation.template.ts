// Inkly e2e crash investigation template
// 使い方:
//   1. tests/e2e/perf/{name}.spec.ts に copy
//   2. NODE_COUNTS / phases / OUT_LABEL を書き換え
//   3. crash 検出時の snapshot 出力先 / assertion を spec の意図に合わせる
//   4. inkly-e2e skill §3 + §7 (crash 捕捉) を self-check

import fs from 'node:fs'
import path from 'node:path'

import type { Page } from '@playwright/test'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

type MemorySnapshot = {
  jsHeapSize: number | null
  totalJSHeapSize: number | null
  jsHeapSizeLimit: number | null
}

type PhaseRecord = {
  phase: string
  elapsedMs: number
  memory: MemorySnapshot
  ok: boolean
  error?: string
}

const OUT_DIR = path.resolve(process.cwd(), '.context/scratch/perf-trace')
const OUT_LABEL = 'crash-template' // FIXME spec 名に書き換え
const NODE_COUNTS = [3000, 5000, 10000] // FIXME

function writeSnapshot(label: string, payload: unknown) {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(payload, null, 2))
}

async function captureMemory(page: Page): Promise<MemorySnapshot> {
  return await page.evaluate(() => {
    const mem = (
      performance as unknown as {
        memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number }
      }
    ).memory
    return {
      jsHeapSize: mem?.usedJSHeapSize ?? null,
      totalJSHeapSize: mem?.totalJSHeapSize ?? null,
      jsHeapSizeLimit: mem?.jsHeapSizeLimit ?? null
    }
  })
}

async function runPhase(
  page: Page,
  phase: string,
  startedAt: number,
  fn: () => Promise<void>,
  records: PhaseRecord[]
): Promise<boolean> {
  try {
    await fn()
    const memory = await captureMemory(page)
    records.push({ phase, elapsedMs: Date.now() - startedAt, memory, ok: true })
    return true
  } catch (err) {
    const memory = await captureMemory(page).catch(() => ({
      jsHeapSize: null,
      totalJSHeapSize: null,
      jsHeapSizeLimit: null
    }))
    records.push({
      phase,
      elapsedMs: Date.now() - startedAt,
      memory,
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    })
    return false
  }
}

const editor = useEditorSetup()

test.describe(`perf-trace ${OUT_LABEL}`, () => {
  for (const nodeCount of NODE_COUNTS) {
    test(`${nodeCount} node の段階的 phase 観測`, async () => {
      test.setTimeout(600_000)

      const records: PhaseRecord[] = []
      const startedAt = Date.now()
      const consoleErrors: string[] = []
      const pageErrors: string[] = []
      const crashes: string[] = []

      editor.page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      editor.page.on('pageerror', (err) => {
        pageErrors.push(err.message)
      })
      editor.page.on('crash', () => {
        crashes.push(`page crashed at ${Date.now() - startedAt}ms`)
      })

      records.push({
        phase: 'baseline',
        elapsedMs: 0,
        memory: await captureMemory(editor.page),
        ok: true
      })

      // FIXME 各 phase を runPhase でラップして追加
      const clearOk = await runPhase(
        editor.page,
        'clearCanvas',
        startedAt,
        async () => {
          await editor.canvas.clearCanvas()
        },
        records
      )

      writeSnapshot(`${OUT_LABEL}-${nodeCount}`, {
        nodeCount,
        records,
        consoleErrors,
        pageErrors,
        crashes,
        terminated: clearOk ? null : 'clearCanvas'
      })

      expect(crashes).toEqual([])
    })
  }
})
