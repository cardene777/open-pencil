import { describe, expect, test, beforeEach } from 'bun:test'

import {
  DEFAULT_DASHBOARD_LAYOUT,
  moveSection,
  readDashboardLayout,
  reorderSection,
  resetDashboardLayout,
  toggleSection,
  writeDashboardLayout
} from '@/app/shell/dashboard-layout'

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key) ?? null : null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  clear() {
    this.store.clear()
  }
}

beforeEach(() => {
  const storage = new MemoryStorage()
  ;(globalThis as unknown as { window: { localStorage: MemoryStorage } }).window = {
    localStorage: storage
  }
})

describe('dashboard-layout', () => {
  test('reads default layout when storage is empty', () => {
    const layout = readDashboardLayout()
    expect(layout).toEqual(DEFAULT_DASHBOARD_LAYOUT)
  })

  test('persists and reads back a custom layout', () => {
    const next = toggleSection(DEFAULT_DASHBOARD_LAYOUT, 'metrics')
    writeDashboardLayout(next)
    expect(readDashboardLayout()).toEqual(next)
  })

  test('reset removes the stored layout', () => {
    writeDashboardLayout(toggleSection(DEFAULT_DASHBOARD_LAYOUT, 'metrics'))
    resetDashboardLayout()
    expect(readDashboardLayout()).toEqual(DEFAULT_DASHBOARD_LAYOUT)
  })

  test('moveSection swaps sections up and down with no-op at boundaries', () => {
    const downOnce = moveSection(DEFAULT_DASHBOARD_LAYOUT, 'metrics', 'down')
    expect(downOnce[0].id).toBe('quickActions')
    expect(downOnce[1].id).toBe('metrics')

    const noopTop = moveSection(DEFAULT_DASHBOARD_LAYOUT, 'metrics', 'up')
    expect(noopTop).toBe(DEFAULT_DASHBOARD_LAYOUT)

    const noopBottom = moveSection(DEFAULT_DASHBOARD_LAYOUT, 'activity', 'down')
    expect(noopBottom).toBe(DEFAULT_DASHBOARD_LAYOUT)
  })

  test('toggleSection flips only the targeted section', () => {
    const after = toggleSection(DEFAULT_DASHBOARD_LAYOUT, 'recent')
    expect(after.find((s) => s.id === 'recent')?.enabled).toBe(false)
    expect(after.find((s) => s.id === 'metrics')?.enabled).toBe(true)
  })

  test('reorderSection moves a section to the slot of the target id', () => {
    const next = reorderSection(DEFAULT_DASHBOARD_LAYOUT, 'activity', 'metrics')
    expect(next[0].id).toBe('activity')
    expect(next[1].id).toBe('metrics')
    expect(next.map((s) => s.id)).toEqual([
      'activity',
      'metrics',
      'quickActions',
      'pinned',
      'recent'
    ])
  })

  test('reorderSection is a no-op when fromId === toId or ids are unknown', () => {
    expect(reorderSection(DEFAULT_DASHBOARD_LAYOUT, 'metrics', 'metrics')).toBe(
      DEFAULT_DASHBOARD_LAYOUT
    )
    expect(
      reorderSection(
        DEFAULT_DASHBOARD_LAYOUT,
        'metrics',
        'unknown' as 'metrics'
      )
    ).toBe(DEFAULT_DASHBOARD_LAYOUT)
  })

  test('readDashboardLayout normalises unknown/incomplete entries and adds missing defaults', () => {
    window.localStorage.setItem(
      'inkly:dashboard-layout',
      JSON.stringify([
        { id: 'activity', enabled: false },
        { id: 'unknown', enabled: true },
        { id: 'metrics' }
      ])
    )
    const layout = readDashboardLayout()
    expect(layout[0]).toEqual({ id: 'activity', enabled: false })
    expect(layout[1]).toEqual({ id: 'metrics', enabled: true })
    expect(layout.map((s) => s.id)).toEqual([
      'activity',
      'metrics',
      'quickActions',
      'pinned',
      'recent'
    ])
  })
})
