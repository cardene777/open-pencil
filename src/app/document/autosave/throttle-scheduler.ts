export type ThrottleTimerHandle = { readonly __throttleTimer: true } | number | object
export type ThrottleSetTimeoutFn = (cb: () => void, ms: number) => ThrottleTimerHandle
export type ThrottleClearTimeoutFn = (handle: ThrottleTimerHandle) => void

export type ThrottleSchedulerOptions = {
  debounceMs: number
  minIntervalMs: number
  maxDelayMs: number
  now?: () => number
  setTimeout?: ThrottleSetTimeoutFn
  clearTimeout?: ThrottleClearTimeoutFn
}

export type ThrottleScheduler<T> = {
  schedule: (token: T) => void
  cancel: () => void
  flush: () => Promise<void>
  pendingToken: () => T | null
  isInFlight: () => boolean
}

type Internal<T> = {
  pending: T | null
  timer: ThrottleTimerHandle | null
  firstScheduledAt: number
  lastFlushedAt: number
  inFlight: boolean
  inFlightPromise: Promise<void> | null
}

const DEFAULTS = {
  debounceMs: 3000,
  minIntervalMs: 5000,
  maxDelayMs: 30000
} as const

const defaultSetTimeout: ThrottleSetTimeoutFn = (cb, ms) => globalThis.setTimeout(cb, ms)
const defaultClearTimeout: ThrottleClearTimeoutFn = (handle) => {
  globalThis.clearTimeout(handle as Parameters<typeof globalThis.clearTimeout>[0])
}

export function createThrottleScheduler<T>(
  flushFn: (token: T) => Promise<void>,
  options: Partial<ThrottleSchedulerOptions> = {}
): ThrottleScheduler<T> {
  const debounceMs = options.debounceMs ?? DEFAULTS.debounceMs
  const minIntervalMs = options.minIntervalMs ?? DEFAULTS.minIntervalMs
  const maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs
  const now = options.now ?? (() => Date.now())
  const _setTimeout = options.setTimeout ?? defaultSetTimeout
  const _clearTimeout = options.clearTimeout ?? defaultClearTimeout

  const state: Internal<T> = {
    pending: null,
    timer: null,
    firstScheduledAt: 0,
    lastFlushedAt: 0,
    inFlight: false,
    inFlightPromise: null
  }

  function clearTimer(): void {
    if (state.timer !== null) {
      _clearTimeout(state.timer)
      state.timer = null
    }
  }

  function nextDelay(): number {
    const t = now()
    const sinceFirst = t - state.firstScheduledAt
    const sinceFlush = state.lastFlushedAt === 0 ? Infinity : t - state.lastFlushedAt
    const minIntervalRemaining = Math.max(0, minIntervalMs - sinceFlush)
    const maxDelayRemaining = Math.max(0, maxDelayMs - sinceFirst)
    const naive = Math.max(debounceMs, minIntervalRemaining)
    return Math.min(naive, maxDelayRemaining)
  }

  async function runFlush(): Promise<void> {
    if (state.pending === null) return
    if (state.inFlight && state.inFlightPromise) {
      await state.inFlightPromise
      if (state.pending === null) return
    }
    const token = state.pending
    state.pending = null
    state.firstScheduledAt = 0
    state.inFlight = true
    const promise = (async () => {
      try {
        await flushFn(token)
      } finally {
        state.lastFlushedAt = now()
        state.inFlight = false
        state.inFlightPromise = null
        if (state.pending !== null) scheduleNext()
      }
    })()
    state.inFlightPromise = promise
    await promise
  }

  function scheduleNext(): void {
    clearTimer()
    const delay = nextDelay()
    state.timer = _setTimeout(() => {
      state.timer = null
      void runFlush()
    }, delay)
  }

  function schedule(token: T): void {
    state.pending = token
    if (state.firstScheduledAt === 0) state.firstScheduledAt = now()
    if (state.inFlight) return
    scheduleNext()
  }

  function cancel(): void {
    clearTimer()
    state.pending = null
    state.firstScheduledAt = 0
  }

  async function flush(): Promise<void> {
    clearTimer()
    await runFlush()
  }

  return {
    schedule,
    cancel,
    flush,
    pendingToken: () => state.pending,
    isInFlight: () => state.inFlight
  }
}
