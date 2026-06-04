import fs from 'node:fs'
import path from 'node:path'

import type { Page } from '@playwright/test'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

type PerfBucketStat = {
  name: string
  track: string
  count: number
  totalMs: number
  avgMs: number
  p50Ms: number
  p95Ms: number
  maxMs: number
}

type PerfSummary = {
  totalEntries: number
  totalMs: number
  stats: PerfBucketStat[]
}

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

type PencilPerf = {
  enable: () => void
  disable: () => void
  clear: () => void
  summary: () => PerfSummary
}

declare global {
  interface Window {
    __pencilPerf?: PencilPerf
  }
}

const OUT_DIR = path.resolve(process.cwd(), '.context/scratch/perf-trace')

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
    records.push({
      phase,
      elapsedMs: Date.now() - startedAt,
      memory,
      ok: true
    })
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

async function seedNodes(page: Page, count: number) {
  await page.evaluate((n) => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store missing')
    const graph = store.graph
    const pageId = store.state.currentPageId
    if (!pageId) throw new Error('currentPageId missing')
    const cols = Math.ceil(Math.sqrt(n))
    const cellW = 30
    const cellH = 30
    for (let i = 0; i < n; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      graph.createNode('RECT', pageId, {
        x: 20 + col * cellW,
        y: 20 + row * cellH,
        width: cellW - 4,
        height: cellH - 4
      })
    }
    store.requestRender()
  }, count)
}

async function pickFirstNode(page: Page) {
  return await page.evaluate(() => {
    const store = window.inkly?.getStore?.()
    if (!store) throw new Error('Inkly store missing')
    const currentPageId = store.state.currentPageId
    if (!currentPageId) throw new Error('currentPageId missing')
    const pageNode = store.graph.getNode(currentPageId)
    const firstChild = pageNode?.childIds[0]
    if (!firstChild) throw new Error('no node')
    const node = store.graph.getNode(firstChild)
    if (!node) throw new Error('no node')
    const abs = store.graph.getAbsolutePosition(firstChild)
    // oxlint-disable-next-line inkly/no-direct-selection-tool-state-mutation
    store.state.selectedIds = new Set([firstChild])
    store.requestRender()
    return { id: firstChild, x: abs.x + node.width / 2, y: abs.y + node.height / 2 }
  })
}

const editor = useEditorSetup()

test.describe('perf-trace mega-doc crash investigation', () => {
  for (const nodeCount of [3000, 5000, 10000]) {
    test(`${nodeCount} node の静止 phase 観測`, async () => {
      test.setTimeout(180_000)

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

      const baselineMemory = await captureMemory(editor.page)
      records.push({ phase: 'baseline', elapsedMs: 0, memory: baselineMemory, ok: true })

      const clearOk = await runPhase(
        editor.page,
        'clearCanvas',
        startedAt,
        async () => {
          await editor.page.evaluate(() => {
            window.__pencilPerf?.enable()
            window.__pencilPerf?.clear()
          })
          await editor.canvas.clearCanvas()
        },
        records
      )
      if (!clearOk) {
        writeSnapshot(`mega-doc-static-${nodeCount}`, {
          nodeCount,
          records,
          consoleErrors,
          pageErrors,
          crashes,
          terminated: 'clearCanvas'
        })
        return
      }

      const seedOk = await runPhase(
        editor.page,
        'seedNodes',
        startedAt,
        async () => {
          await seedNodes(editor.page, nodeCount)
        },
        records
      )
      if (!seedOk) {
        writeSnapshot(`mega-doc-static-${nodeCount}`, {
          nodeCount,
          records,
          consoleErrors,
          pageErrors,
          crashes,
          terminated: 'seedNodes'
        })
        return
      }

      const renderOk = await runPhase(
        editor.page,
        'initialRender',
        startedAt,
        async () => {
          await editor.canvas.waitForRender()
        },
        records
      )
      if (!renderOk) {
        writeSnapshot(`mega-doc-static-${nodeCount}`, {
          nodeCount,
          records,
          consoleErrors,
          pageErrors,
          crashes,
          terminated: 'initialRender'
        })
        return
      }

      const idleOk = await runPhase(
        editor.page,
        'idle3s',
        startedAt,
        async () => {
          await editor.page.waitForTimeout(3000)
        },
        records
      )

      const summary = await editor.page
        .evaluate(() => window.__pencilPerf?.summary())
        .catch(() => null)

      writeSnapshot(`mega-doc-static-${nodeCount}`, {
        nodeCount,
        records,
        consoleErrors,
        pageErrors,
        crashes,
        summary,
        terminated: idleOk ? null : 'idle3s'
      })

      expect(crashes).toEqual([])
    })
  }

  for (const dragSteps of [1, 3, 6]) {
    test(`3000 node の drag ${dragSteps} step 観測 (crash trigger 切り分け)`, async () => {
      test.setTimeout(180_000)
      const nodeCount = 3000

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

      const baselineMemory = await captureMemory(editor.page)
      records.push({ phase: 'baseline', elapsedMs: 0, memory: baselineMemory, ok: true })

      const clearOk = await runPhase(
        editor.page,
        'clearCanvas',
        startedAt,
        async () => {
          await editor.page.evaluate(() => {
            window.__pencilPerf?.enable()
            window.__pencilPerf?.clear()
          })
          await editor.canvas.clearCanvas()
        },
        records
      )

      if (!clearOk) {
        writeSnapshot(`mega-doc-${nodeCount}`, {
          nodeCount,
          records,
          consoleErrors,
          pageErrors,
          crashes,
          terminated: 'clearCanvas'
        })
        return
      }

      const seedOk = await runPhase(
        editor.page,
        'seedNodes',
        startedAt,
        async () => {
          await seedNodes(editor.page, nodeCount)
        },
        records
      )

      if (!seedOk) {
        writeSnapshot(`mega-doc-${nodeCount}`, {
          nodeCount,
          records,
          consoleErrors,
          pageErrors,
          crashes,
          terminated: 'seedNodes'
        })
        return
      }

      const renderOk = await runPhase(
        editor.page,
        'initialRender',
        startedAt,
        async () => {
          await editor.canvas.waitForRender()
        },
        records
      )

      if (!renderOk) {
        writeSnapshot(`mega-doc-${nodeCount}`, {
          nodeCount,
          records,
          consoleErrors,
          pageErrors,
          crashes,
          terminated: 'initialRender'
        })
        return
      }

      const target = await pickFirstNode(editor.page).catch(() => null)
      if (!target) {
        records.push({
          phase: 'pickFirstNode',
          elapsedMs: Date.now() - startedAt,
          memory: await captureMemory(editor.page),
          ok: false,
          error: 'pickFirstNode failed'
        })
        writeSnapshot(`mega-doc-${nodeCount}`, {
          nodeCount,
          records,
          consoleErrors,
          pageErrors,
          crashes,
          terminated: 'pickFirstNode'
        })
        return
      }

      await editor.page.evaluate(() => window.__pencilPerf?.clear())

      const dragOk = await runPhase(
        editor.page,
        `drag${dragSteps}step`,
        startedAt,
        async () => {
          const startX = target.x
          const startY = target.y
          for (let i = 1; i <= dragSteps; i++) {
            const toX = startX + i * 24
            const toY = startY + Math.round(Math.sin(i / 2) * 18)
            await editor.canvas.drag(startX + (i - 1) * 24, startY, toX, toY, 24)
            await editor.canvas.waitForRender()
          }
        },
        records
      )

      const summary = await editor.page
        .evaluate(() => window.__pencilPerf?.summary())
        .catch(() => null)
      const frame = summary?.stats.find((s) => s.name === 'frame')

      writeSnapshot(`mega-doc-3000-drag${dragSteps}`, {
        nodeCount,
        dragSteps,
        records,
        consoleErrors,
        pageErrors,
        crashes,
        summary,
        terminated: dragOk ? null : `drag${dragSteps}step`
      })

      expect(crashes).toEqual([])
      expect(summary?.totalEntries ?? 0).toBeGreaterThan(0)
      expect(frame?.maxMs ?? 0).toBeLessThan(61)
    })
  }
})
