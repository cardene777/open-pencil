import { perfTracer } from '@inkly/core/profiler'
import type { PerfTraceEntry } from '@inkly/core/profiler'

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

const RING_BUFFER_LIMIT = 4000

const entries: PerfTraceEntry[] = []

let started = false

function pushEntry(entry: PerfTraceEntry) {
  entries.push(entry)
  if (entries.length > RING_BUFFER_LIMIT) {
    entries.splice(0, entries.length - RING_BUFFER_LIMIT)
  }
}

function aggregate(): PerfBucketStat[] {
  const buckets = new Map<string, number[]>()
  const tracks = new Map<string, string>()
  for (const e of entries) {
    const key = `${e.track}:${e.name}`
    let samples = buckets.get(key)
    if (!samples) {
      samples = []
      buckets.set(key, samples)
      tracks.set(key, e.track)
    }
    samples.push(e.duration)
  }
  const stats: PerfBucketStat[] = []
  for (const [key, samples] of buckets.entries()) {
    samples.sort((a, b) => a - b)
    const total = samples.reduce((s, v) => s + v, 0)
    const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0
    const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0
    const max = samples[samples.length - 1] ?? 0
    const [, name] = key.split(/:(.+)/)
    stats.push({
      name: name ?? key,
      track: tracks.get(key) ?? '',
      count: samples.length,
      totalMs: total,
      avgMs: total / samples.length,
      p50Ms: p50,
      p95Ms: p95,
      maxMs: max
    })
  }
  stats.sort((a, b) => b.totalMs - a.totalMs)
  return stats
}

function summary(): { totalEntries: number; totalMs: number; stats: PerfBucketStat[] } {
  const stats = aggregate()
  const totalMs = stats.reduce((s, v) => s + v.totalMs, 0)
  return { totalEntries: entries.length, totalMs, stats }
}

function dump(): void {
  const s = summary()
  console.debug(
    `[pencil-perf] ${s.totalEntries} entries, total ${s.totalMs.toFixed(1)} ms`,
    s.stats.map((row) => ({
      track: row.track,
      name: row.name,
      count: row.count,
      total: Number(row.totalMs.toFixed(2)),
      avg: Number(row.avgMs.toFixed(3)),
      p50: Number(row.p50Ms.toFixed(3)),
      p95: Number(row.p95Ms.toFixed(3)),
      max: Number(row.maxMs.toFixed(3))
    }))
  )
}

function clear(): void {
  entries.length = 0
}

function exportJson(): string {
  return JSON.stringify({ summary: summary(), entries }, null, 2)
}

function download(): void {
  if (typeof document === 'undefined') return
  const blob = new Blob([exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pencil-perf-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function startPerfTraceReporter(): void {
  if (started) return
  started = true
  perfTracer.addListener(pushEntry)
  const g = globalThis as {
    __pencilPerf?: {
      enable: () => void
      disable: () => void
      dump: () => void
      clear: () => void
      summary: () => ReturnType<typeof summary>
      export: () => string
      download: () => void
      entries: () => PerfTraceEntry[]
    }
  }
  g.__pencilPerf = {
    enable: () => perfTracer.enable(),
    disable: () => perfTracer.disable(),
    dump,
    clear,
    summary,
    export: exportJson,
    download,
    entries: () => entries.slice()
  }
}
