type DevToolsColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'tertiary-dark'
  | 'secondary-dark'
  | 'secondary-light'

type PerfTraceTrack = 'IO' | 'Collab' | 'Renderer' | 'Custom'

type PerfTraceEntry = {
  name: string
  track: PerfTraceTrack
  duration: number
  startTime: number
  detail?: Record<string, unknown>
}

type PerfTraceListener = (entry: PerfTraceEntry) => void

function colorForTrack(track: PerfTraceTrack, name: string): DevToolsColor {
  if (track === 'IO') {
    if (name.startsWith('autosave:encode')) return 'tertiary'
    if (name.startsWith('autosave:write')) return 'tertiary-dark'
    if (name.startsWith('autosave:')) return 'secondary'
    return 'secondary-light'
  }
  if (track === 'Collab') {
    if (name.startsWith('yjs:transact')) return 'tertiary'
    if (name.startsWith('yjs:images')) return 'tertiary-dark'
    return 'secondary'
  }
  return 'secondary-light'
}

function readEnabledFromGlobal(): boolean {
  const g = globalThis as { __PENCIL_PERF_TRACE__?: boolean }
  return g.__PENCIL_PERF_TRACE__ === true
}

export class PerfTracer {
  private listeners: PerfTraceListener[] = []
  private explicitEnabled: boolean | null = null

  enable(): void {
    this.explicitEnabled = true
  }

  disable(): void {
    this.explicitEnabled = false
  }

  get enabled(): boolean {
    if (this.explicitEnabled !== null) return this.explicitEnabled
    return readEnabledFromGlobal()
  }

  addListener(listener: PerfTraceListener): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  measure<T>(name: string, track: PerfTraceTrack, fn: () => T, detail?: Record<string, unknown>): T {
    if (!this.enabled || typeof performance === 'undefined') return fn()
    const startTime = performance.now()
    try {
      return fn()
    } finally {
      this.emit(name, track, startTime, detail)
    }
  }

  async measureAsync<T>(
    name: string,
    track: PerfTraceTrack,
    fn: () => Promise<T>,
    detail?: Record<string, unknown>
  ): Promise<T> {
    if (!this.enabled || typeof performance === 'undefined') return fn()
    const startTime = performance.now()
    try {
      return await fn()
    } finally {
      this.emit(name, track, startTime, detail)
    }
  }

  mark(name: string, track: PerfTraceTrack, detail?: Record<string, unknown>): () => void {
    if (!this.enabled || typeof performance === 'undefined') {
      return noopMarkEnd
    }
    const startTime = performance.now()
    return () => this.emit(name, track, startTime, detail)
  }

  observe(name: string, track: PerfTraceTrack, startTime: number, endTime: number, detail?: Record<string, unknown>): void {
    if (!this.enabled) return
    const duration = endTime - startTime
    const entry: PerfTraceEntry = { name, track, duration, startTime, detail }
    for (const listener of this.listeners) listener(entry)
  }

  private emit(name: string, track: PerfTraceTrack, startTime: number, detail?: Record<string, unknown>): void {
    const endTime = performance.now()
    const duration = endTime - startTime
    performance.measure(name, {
      start: startTime,
      end: endTime,
      detail: {
        devtools: {
          dataType: 'track-entry',
          track: track === 'Custom' ? 'Custom' : track,
          trackGroup: 'Inkly',
          color: colorForTrack(track, name),
          properties: detail ? Object.entries(detail).map(([k, v]) => [k, String(v)]) : undefined
        }
      }
    })
    const entry: PerfTraceEntry = { name, track, duration, startTime, detail }
    for (const listener of this.listeners) listener(entry)
  }
}

function noopMarkEnd(): void {
  /* disabled tracer fallback */
}

export const perfTracer = new PerfTracer()

export type { PerfTraceEntry, PerfTraceListener, PerfTraceTrack }
