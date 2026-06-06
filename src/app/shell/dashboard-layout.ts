const DASHBOARD_LAYOUT_KEY = 'inkly:dashboard-layout'

export type DashboardSectionId = 'metrics' | 'quickActions' | 'pinned' | 'recent' | 'activity'

export interface DashboardSectionConfig {
  id: DashboardSectionId
  enabled: boolean
}

export const DEFAULT_DASHBOARD_LAYOUT: DashboardSectionConfig[] = [
  { id: 'metrics', enabled: true },
  { id: 'quickActions', enabled: true },
  { id: 'pinned', enabled: true },
  { id: 'recent', enabled: true },
  { id: 'activity', enabled: true }
]

const ALL_IDS: DashboardSectionId[] = ['metrics', 'quickActions', 'pinned', 'recent', 'activity']

function isSectionId(value: unknown): value is DashboardSectionId {
  return typeof value === 'string' && (ALL_IDS as string[]).includes(value)
}

function normalize(value: unknown): DashboardSectionConfig[] {
  if (!Array.isArray(value)) return DEFAULT_DASHBOARD_LAYOUT.slice()
  const seen = new Set<DashboardSectionId>()
  const result: DashboardSectionConfig[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const id = (entry as { id?: unknown }).id
    const enabled = (entry as { enabled?: unknown }).enabled
    if (!isSectionId(id)) continue
    if (seen.has(id)) continue
    seen.add(id)
    result.push({ id, enabled: enabled !== false })
  }

  for (const fallback of DEFAULT_DASHBOARD_LAYOUT) {
    if (!seen.has(fallback.id)) {
      result.push({ ...fallback })
    }
  }

  return result
}

export function readDashboardLayout(): DashboardSectionConfig[] {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_LAYOUT.slice()
  try {
    const raw = window.localStorage.getItem(DASHBOARD_LAYOUT_KEY)
    if (!raw) return DEFAULT_DASHBOARD_LAYOUT.slice()
    return normalize(JSON.parse(raw))
  } catch {
    return DEFAULT_DASHBOARD_LAYOUT.slice()
  }
}

export function writeDashboardLayout(layout: DashboardSectionConfig[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, JSON.stringify(layout))
  } catch (error) {
    console.warn('[dashboard] failed to persist layout:', error)
  }
}

export function resetDashboardLayout() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(DASHBOARD_LAYOUT_KEY)
}

export function moveSection(
  layout: DashboardSectionConfig[],
  id: DashboardSectionId,
  direction: 'up' | 'down'
): DashboardSectionConfig[] {
  const index = layout.findIndex((section) => section.id === id)
  if (index === -1) return layout
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= layout.length) return layout
  const next = layout.slice()
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function toggleSection(
  layout: DashboardSectionConfig[],
  id: DashboardSectionId
): DashboardSectionConfig[] {
  return layout.map((section) =>
    section.id === id ? { ...section, enabled: !section.enabled } : section
  )
}

/**
 * Re-insert the section identified by `fromId` directly before `toId`. When
 * `toId` is the same section or either id is unknown, returns the original
 * layout unchanged (referential equality preserved so callers can early out).
 */
export function reorderSection(
  layout: DashboardSectionConfig[],
  fromId: DashboardSectionId,
  toId: DashboardSectionId
): DashboardSectionConfig[] {
  if (fromId === toId) return layout
  const fromIndex = layout.findIndex((section) => section.id === fromId)
  const toIndex = layout.findIndex((section) => section.id === toId)
  if (fromIndex === -1 || toIndex === -1) return layout

  const next = layout.slice()
  const [moved] = next.splice(fromIndex, 1)
  const insertAt = next.findIndex((section) => section.id === toId)
  next.splice(insertAt, 0, moved)
  return next
}
