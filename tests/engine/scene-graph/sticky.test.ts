import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@inkly/core'
import {
  createStickyNote,
  getStickyColorKey,
  getStickyNoteText,
  isStickyNote,
  setStickyNoteColor,
  setStickyNoteText,
  STICKY_COLOR_KEYS,
  STICKY_NOTE_DEFAULT_HEIGHT,
  STICKY_NOTE_DEFAULT_WIDTH,
  STICKY_NOTE_PLUGIN_ID
} from '@inkly/core/scene-graph'

import { expectDefined, getNodeOrThrow } from '#tests/helpers/assert'

function setup() {
  const graph = new SceneGraph()
  const pages = graph.getPages()
  const page = expectDefined(pages[0], 'first page')
  return { graph, pageId: page.id }
}

describe('sticky note helper', () => {
  test('createStickyNote returns RECTANGLE + child TEXT pair', () => {
    const { graph, pageId } = setup()
    const { rectId, textId } = createStickyNote(graph, pageId, { x: 100, y: 200 })

    const rect = getNodeOrThrow(graph, rectId)
    const text = getNodeOrThrow(graph, textId)
    expect(rect.type).toBe('RECTANGLE')
    expect(text.type).toBe('TEXT')
    expect(rect.childIds).toContain(textId)
    expect(rect.width).toBe(STICKY_NOTE_DEFAULT_WIDTH)
    expect(rect.height).toBe(STICKY_NOTE_DEFAULT_HEIGHT)
    expect(rect.x).toBe(100)
    expect(rect.y).toBe(200)
  })

  test('isStickyNote identifies created sticky via pluginData', () => {
    const { graph, pageId } = setup()
    const { rectId } = createStickyNote(graph, pageId, { x: 0, y: 0 })
    const rect = getNodeOrThrow(graph, rectId)
    expect(isStickyNote(rect)).toBe(true)
  })

  test('isStickyNote returns false for plain RECTANGLE without sticky pluginData', () => {
    const { graph, pageId } = setup()
    const plain = graph.createNode('RECTANGLE', pageId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
    expect(isStickyNote(plain)).toBe(false)
  })

  test('isStickyNote returns false for null / undefined', () => {
    expect(isStickyNote(null)).toBe(false)
    expect(isStickyNote(undefined)).toBe(false)
  })

  test('default color is yellow', () => {
    const { graph, pageId } = setup()
    const { rectId } = createStickyNote(graph, pageId, { x: 0, y: 0 })
    const rect = getNodeOrThrow(graph, rectId)
    expect(getStickyColorKey(rect)).toBe('yellow')
  })

  test('setStickyNoteColor updates color pluginData and fills', () => {
    const { graph, pageId } = setup()
    const { rectId } = createStickyNote(graph, pageId, { x: 0, y: 0 })

    setStickyNoteColor(graph, rectId, 'pink')

    const rect = getNodeOrThrow(graph, rectId)
    expect(getStickyColorKey(rect)).toBe('pink')
    const colorEntry = rect.pluginData?.find(
      (p) => p.pluginId === STICKY_NOTE_PLUGIN_ID && p.key === 'color'
    )
    expect(colorEntry?.value).toBe('pink')
    expect(rect.fills.length).toBe(1)
  })

  test('setStickyNoteColor accepts every preset color', () => {
    const { graph, pageId } = setup()
    const { rectId } = createStickyNote(graph, pageId, { x: 0, y: 0 })
    for (const key of STICKY_COLOR_KEYS) {
      setStickyNoteColor(graph, rectId, key)
      const rect = getNodeOrThrow(graph, rectId)
      expect(getStickyColorKey(rect)).toBe(key)
    }
  })

  test('setStickyNoteColor ignores non sticky nodes', () => {
    const { graph, pageId } = setup()
    const plain = graph.createNode('RECTANGLE', pageId, {
      x: 0,
      y: 0,
      width: 50,
      height: 50
    })
    const fillsBefore = plain.fills
    setStickyNoteColor(graph, plain.id, 'pink')
    const after = getNodeOrThrow(graph, plain.id)
    expect(after.fills).toEqual(fillsBefore)
  })

  test('setStickyNoteText / getStickyNoteText round trip', () => {
    const { graph, pageId } = setup()
    const { rectId } = createStickyNote(graph, pageId, { x: 0, y: 0 })
    expect(getStickyNoteText(graph, rectId)).toBe('')

    setStickyNoteText(graph, rectId, 'hello miro')
    expect(getStickyNoteText(graph, rectId)).toBe('hello miro')
  })

  test('getStickyNoteText returns empty string for non sticky nodes', () => {
    const { graph, pageId } = setup()
    const plain = graph.createNode('RECTANGLE', pageId, {
      x: 0,
      y: 0,
      width: 10,
      height: 10
    })
    expect(getStickyNoteText(graph, plain.id)).toBe('')
  })

  test('createStickyNote with explicit color sets background and pluginData', () => {
    const { graph, pageId } = setup()
    const { rectId } = createStickyNote(graph, pageId, { x: 0, y: 0, color: 'blue' })
    const rect = getNodeOrThrow(graph, rectId)
    expect(getStickyColorKey(rect)).toBe('blue')
  })
})
