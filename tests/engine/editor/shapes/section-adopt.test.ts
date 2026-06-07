import { describe, expect, test } from 'bun:test'

import { createEditor } from '@inkly/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

describe('adoptNodesIntoSection', () => {
  function setup() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const section = editor.graph.createNode('SECTION', pageId, {
      name: 'Section',
      x: 100,
      y: 100,
      width: 400,
      height: 300
    })

    return { editor, pageId, section }
  }

  test('no-op when sectionId references a non-SECTION node', () => {
    const { editor, pageId } = setup()
    const rect = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Rect',
      x: 120,
      y: 120,
      width: 50,
      height: 50
    })

    editor.adoptNodesIntoSection(rect.id)

    expect(getNodeOrThrow(editor.graph, rect.id).parentId).toBe(pageId)
    expect(editor.undo.canUndo).toBe(false)
  })

  test('no-op when no siblings are fully inside the section bounds', () => {
    const { editor, pageId, section } = setup()
    const outside = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Outside',
      x: 600,
      y: 600,
      width: 30,
      height: 30
    })

    editor.adoptNodesIntoSection(section.id)

    expect(getNodeOrThrow(editor.graph, outside.id).parentId).toBe(pageId)
    expect(editor.undo.canUndo).toBe(false)
  })

  test('adopts a sibling whose bounds are fully inside the section', () => {
    const { editor, pageId, section } = setup()
    const inside = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Inside',
      x: 150,
      y: 150,
      width: 80,
      height: 80
    })

    editor.adoptNodesIntoSection(section.id)

    const adopted = getNodeOrThrow(editor.graph, inside.id)
    expect(adopted.parentId).toBe(section.id)
    expect(adopted.x).toBe(50)
    expect(adopted.y).toBe(50)
  })

  test('leaves a sibling that straddles the section boundary in place', () => {
    const { editor, pageId, section } = setup()
    const partial = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Partial',
      x: 90,
      y: 90,
      width: 100,
      height: 100
    })

    editor.adoptNodesIntoSection(section.id)

    const node = getNodeOrThrow(editor.graph, partial.id)
    expect(node.parentId).toBe(pageId)
    expect(node.x).toBe(90)
    expect(node.y).toBe(90)
  })

  test('skips the section itself even though it sits inside its own bounds', () => {
    const { editor, section } = setup()

    editor.adoptNodesIntoSection(section.id)

    const after = getNodeOrThrow(editor.graph, section.id)
    expect(after.parentId).toBeDefined()
    expect(editor.undo.canUndo).toBe(false)
  })

  test('undo restores original parent and coordinates for all adopted siblings', () => {
    const { editor, pageId, section } = setup()
    const inside1 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Inside1',
      x: 150,
      y: 150,
      width: 50,
      height: 50
    })
    const inside2 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Inside2',
      x: 250,
      y: 200,
      width: 40,
      height: 40
    })

    editor.adoptNodesIntoSection(section.id)
    editor.undo.undo()

    const restored1 = getNodeOrThrow(editor.graph, inside1.id)
    const restored2 = getNodeOrThrow(editor.graph, inside2.id)
    expect(restored1.parentId).toBe(pageId)
    expect(restored1.x).toBe(150)
    expect(restored1.y).toBe(150)
    expect(restored2.parentId).toBe(pageId)
    expect(restored2.x).toBe(250)
    expect(restored2.y).toBe(200)
  })

  test('redo re-applies the adoption after undo', () => {
    const { editor, pageId, section } = setup()
    const inside = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Inside',
      x: 200,
      y: 200,
      width: 50,
      height: 50
    })

    editor.adoptNodesIntoSection(section.id)
    editor.undo.undo()
    editor.undo.redo()

    const after = getNodeOrThrow(editor.graph, inside.id)
    expect(after.parentId).toBe(section.id)
    expect(after.x).toBe(100)
    expect(after.y).toBe(100)
  })
})
