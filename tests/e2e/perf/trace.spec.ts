import fs from 'node:fs'
import path from 'node:path'

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

type PerfEntry = {
  name: string
  track: string
  duration: number
  startTime: number
}

type PencilPerf = {
  enable: () => void
  disable: () => void
  clear: () => void
  summary: () => PerfSummary
  export: () => string
  entries: () => PerfEntry[]
}

declare global {
  interface Window {
    __pencilPerf?: PencilPerf
  }
}

const OUT_DIR = path.resolve(process.cwd(), '.context/scratch/perf-trace')

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
}

function writeSnapshot(label: string, payload: unknown) {
  ensureOutDir()
  fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(payload, null, 2))
}

function summaryByTrack(summary: PerfSummary | undefined): Record<string, PerfBucketStat[]> {
  if (!summary) return {}
  const byTrack: Record<string, PerfBucketStat[]> = {}
  for (const stat of summary.stats) {
    byTrack[stat.track] ??= []
    byTrack[stat.track].push(stat)
  }
  return byTrack
}

const editor = useEditorSetup()

test.describe('perf-trace hotpaths', () => {
  test('drag chain / autosave を計測し JSON 保存', async () => {
    test.setTimeout(180_000)

    await editor.page.evaluate(() => {
      window.__pencilPerf?.enable()
      window.__pencilPerf?.clear()
    })

    await editor.canvas.drawRect(220, 200, 120, 80)
    await editor.canvas.drawRect(380, 230, 100, 60)
    await editor.canvas.drawRect(540, 200, 90, 110)
    await editor.canvas.waitForRender()

    await editor.page.evaluate(() => window.__pencilPerf?.clear())

    await editor.canvas.click(280, 240)
    await editor.canvas.waitForRender()

    const dragStart = { x: 280, y: 240 }
    const steps = 40
    for (let i = 1; i <= 6; i++) {
      const toX = dragStart.x + i * 30
      const toY = dragStart.y + Math.round(Math.sin(i / 2) * 24)
      await editor.canvas.drag(dragStart.x + (i - 1) * 30, dragStart.y, toX, toY, steps)
      await editor.canvas.waitForRender()
    }

    const dragSummary = await editor.page.evaluate(() => window.__pencilPerf?.summary())
    writeSnapshot('drag', dragSummary)
    writeSnapshot('drag-by-track', summaryByTrack(dragSummary))
    expect(dragSummary?.totalEntries ?? 0).toBeGreaterThan(0)

    const dragEntries = await editor.page.evaluate(() =>
      window.__pencilPerf?.entries().filter((e) => e.track === 'Custom' || e.track === 'Renderer')
    )
    writeSnapshot('drag-entries-raw', dragEntries ?? [])

    await editor.page.evaluate(() => window.__pencilPerf?.clear())

    for (let i = 0; i < 16; i++) {
      await editor.canvas.drawRect(60 + i * 18, 480 + (i % 5) * 14, 24, 16)
    }
    await editor.canvas.waitForRender()

    await editor.page.waitForTimeout(5500)

    const autosaveSummary = await editor.page.evaluate(() => window.__pencilPerf?.summary())
    writeSnapshot('autosave', autosaveSummary)

    const fullSummary = {
      drag: dragSummary,
      autosave: autosaveSummary
    }
    writeSnapshot('combined', fullSummary)

    editor.canvas.assertNoErrors()
  })

  test('連続編集 30 秒中の autosave 起動回数が throttle scheduler で抑制される', async () => {
    test.setTimeout(180_000)

    await editor.page.evaluate(() => {
      window.__pencilPerf?.enable()
      window.__pencilPerf?.clear()
    })

    const startTs = Date.now()
    while (Date.now() - startTs < 30_000) {
      const i = Math.floor((Date.now() - startTs) / 1000)
      await editor.canvas.drawRect(50 + (i * 9) % 600, 80 + (i % 8) * 12, 14, 12)
    }
    await editor.canvas.waitForRender()
    await editor.page.waitForTimeout(2000)

    const summary = await editor.page.evaluate(() => window.__pencilPerf?.summary())
    writeSnapshot('autosave-30s', summary)

    const encodeStat = summary?.stats.find((s) => s.name === 'autosave:encode')
    const writeStat = summary?.stats.find((s) => s.name === 'autosave:write')
    const totalStat = summary?.stats.find((s) => s.name === 'autosave:total')

    expect(encodeStat).toBeTruthy()
    expect(writeStat).toBeTruthy()
    expect(totalStat).toBeTruthy()
    expect(encodeStat?.count ?? 0).toBeLessThanOrEqual(8)
    expect(writeStat?.count ?? 0).toBeLessThanOrEqual(8)
    expect(totalStat?.count ?? 0).toBeLessThanOrEqual(8)

    editor.canvas.assertNoErrors()
  })
})
