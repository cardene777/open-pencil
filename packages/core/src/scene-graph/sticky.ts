/**
 * miro 互換の sticky note helper。 scene-graph 自体に新 NodeType を足さず
 * `RECTANGLE` + child `TEXT` の組合せ + `pluginData` の `kind: sticky` flag で
 * 識別する。 io / serialize 経路に影響を出さずに付箋を表現できる。
 */
import type { Color } from '#core/types'

import type { SceneGraph } from './index.js'
import type { PluginDataEntry, SceneNode } from './types.js'

export const STICKY_NOTE_PLUGIN_ID = 'inkly.sticky'
export const STICKY_NOTE_KIND_KEY = 'kind'
export const STICKY_NOTE_KIND_VALUE = 'sticky'
export const STICKY_NOTE_COLOR_KEY = 'color'

export const STICKY_NOTE_DEFAULT_WIDTH = 240
export const STICKY_NOTE_DEFAULT_HEIGHT = 240
export const STICKY_NOTE_CORNER_RADIUS = 12

export type StickyColorKey =
  | 'yellow'
  | 'pink'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange'

interface StickyColorPreset {
  /** sticky 自体 (RECTANGLE) の背景色 */
  background: Color
  /** 内側の TEXT の色 (背景に対し読みやすい色) */
  text: Color
}

const STICKY_COLOR_PRESETS: Record<StickyColorKey, StickyColorPreset> = {
  yellow: {
    background: { r: 1.0, g: 0.95, b: 0.55, a: 1 },
    text: { r: 0.15, g: 0.1, b: 0.0, a: 1 }
  },
  pink: {
    background: { r: 1.0, g: 0.71, b: 0.78, a: 1 },
    text: { r: 0.2, g: 0.06, b: 0.1, a: 1 }
  },
  blue: {
    background: { r: 0.71, g: 0.85, b: 1.0, a: 1 },
    text: { r: 0.06, g: 0.12, b: 0.25, a: 1 }
  },
  green: {
    background: { r: 0.74, g: 0.93, b: 0.79, a: 1 },
    text: { r: 0.07, g: 0.18, b: 0.1, a: 1 }
  },
  purple: {
    background: { r: 0.86, g: 0.75, b: 1.0, a: 1 },
    text: { r: 0.18, g: 0.08, b: 0.28, a: 1 }
  },
  orange: {
    background: { r: 1.0, g: 0.78, b: 0.55, a: 1 },
    text: { r: 0.3, g: 0.12, b: 0.0, a: 1 }
  }
}

export const STICKY_COLOR_KEYS: readonly StickyColorKey[] = [
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
  'orange'
]

export function getStickyColorPreset(key: StickyColorKey): StickyColorPreset {
  return STICKY_COLOR_PRESETS[key] ?? STICKY_COLOR_PRESETS.yellow
}

/**
 * SceneNode が sticky note かどうかを `pluginData` の kind flag で判定する。
 */
export function isStickyNote(node: SceneNode | null | undefined): boolean {
  if (!node) return false
  const entry = node.pluginData?.find(
    (p) =>
      p.pluginId === STICKY_NOTE_PLUGIN_ID && p.key === STICKY_NOTE_KIND_KEY
  )
  return entry?.value === STICKY_NOTE_KIND_VALUE
}

export function getStickyColorKey(node: SceneNode): StickyColorKey {
  const entry = node.pluginData?.find(
    (p) =>
      p.pluginId === STICKY_NOTE_PLUGIN_ID && p.key === STICKY_NOTE_COLOR_KEY
  )
  const value = entry?.value
  if (value && (STICKY_COLOR_KEYS as readonly string[]).includes(value)) {
    return value as StickyColorKey
  }
  return 'yellow'
}

function withStickyPluginData(
  list: PluginDataEntry[],
  updates: Array<[string, string]>
): PluginDataEntry[] {
  const next = [...list]
  for (const [key, value] of updates) {
    const idx = next.findIndex(
      (p) => p.pluginId === STICKY_NOTE_PLUGIN_ID && p.key === key
    )
    if (idx !== -1) {
      next[idx] = { pluginId: STICKY_NOTE_PLUGIN_ID, key, value }
    } else {
      next.push({ pluginId: STICKY_NOTE_PLUGIN_ID, key, value })
    }
  }
  return next
}

/**
 * sticky note を作成する。 RECTANGLE を作って `pluginData` で sticky 化、
 * 子に TEXT を持たせて中央寄せの空文字列で初期化。 graph.updateNode 経由で
 * 既存 yjs sync 経路に乗るため collab 同期も自動で行われる。
 */
export function createStickyNote(
  graph: SceneGraph,
  parentPageId: string,
  options: { x: number; y: number; color?: StickyColorKey } = { x: 0, y: 0 }
): { rectId: string; textId: string } {
  const colorKey = options.color ?? 'yellow'
  const preset = getStickyColorPreset(colorKey)

  const rect = graph.createNode('RECTANGLE', parentPageId, {
    name: 'Sticky',
    x: options.x,
    y: options.y,
    width: STICKY_NOTE_DEFAULT_WIDTH,
    height: STICKY_NOTE_DEFAULT_HEIGHT,
    cornerRadius: STICKY_NOTE_CORNER_RADIUS,
    fills: [
      {
        type: 'SOLID',
        color: preset.background,
        opacity: 1,
        visible: true
      }
    ],
    strokes: [],
    effects: [
      {
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.12 },
        offset: { x: 0, y: 4 },
        radius: 12,
        spread: 0,
        visible: true,
        blendMode: 'NORMAL',
        showShadowBehindNode: false
      }
    ]
  })

  graph.updateNode(rect.id, {
    pluginData: withStickyPluginData(rect.pluginData ?? [], [
      [STICKY_NOTE_KIND_KEY, STICKY_NOTE_KIND_VALUE],
      [STICKY_NOTE_COLOR_KEY, colorKey]
    ])
  })

  const text = graph.createNode('TEXT', rect.id, {
    name: 'Sticky text',
    x: 16,
    y: 16,
    width: STICKY_NOTE_DEFAULT_WIDTH - 32,
    height: STICKY_NOTE_DEFAULT_HEIGHT - 32,
    text: '',
    fontSize: 16,
    textAlignHorizontal: 'CENTER',
    textAlignVertical: 'CENTER',
    fills: [
      {
        type: 'SOLID',
        color: preset.text,
        opacity: 1,
        visible: true
      }
    ]
  })

  return { rectId: rect.id, textId: text.id }
}

/**
 * 既存 sticky の色を変更する。 RECTANGLE の fills と child TEXT の fills を
 * preset に合わせて更新、 `pluginData.color` も新 key で書き戻す。
 */
export function setStickyNoteColor(
  graph: SceneGraph,
  stickyRectId: string,
  colorKey: StickyColorKey
): void {
  const rect = graph.getNode(stickyRectId)
  if (!rect || !isStickyNote(rect)) return

  const preset = getStickyColorPreset(colorKey)
  graph.updateNode(rect.id, {
    fills: [
      {
        type: 'SOLID',
        color: preset.background,
        opacity: 1,
        visible: true
      }
    ],
    pluginData: withStickyPluginData(rect.pluginData ?? [], [
      [STICKY_NOTE_COLOR_KEY, colorKey]
    ])
  })

  for (const childId of rect.childIds) {
    const child = graph.getNode(childId)
    if (!child || child.type !== 'TEXT') continue
    graph.updateNode(childId, {
      fills: [
        {
          type: 'SOLID',
          color: preset.text,
          opacity: 1,
          visible: true
        }
      ]
    })
  }
}

/**
 * sticky note の text を更新する。 child TEXT の characters を書き換える。
 */
export function setStickyNoteText(
  graph: SceneGraph,
  stickyRectId: string,
  text: string
): void {
  const rect = graph.getNode(stickyRectId)
  if (!rect || !isStickyNote(rect)) return
  for (const childId of rect.childIds) {
    const child = graph.getNode(childId)
    if (!child || child.type !== 'TEXT') continue
    graph.updateNode(childId, { text })
    return
  }
}

/**
 * sticky note の text を取得する。
 */
export function getStickyNoteText(graph: SceneGraph, stickyRectId: string): string {
  const rect = graph.getNode(stickyRectId)
  if (!rect || !isStickyNote(rect)) return ''
  for (const childId of rect.childIds) {
    const child = graph.getNode(childId)
    if (!child || child.type !== 'TEXT') continue
    return child.text ?? ''
  }
  return ''
}
