import { describe, expect, test } from 'bun:test'

import { createEditor } from '@inkly/core/editor'

import { getNodeOrThrow } from '#tests/helpers/assert'

describe('ungroupSelected', () => {
  function setupGroupWithChildren() {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id

    const child1 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Child1',
      x: 10,
      y: 20,
      width: 30,
      height: 40
    })
    const child2 = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Child2',
      x: 50,
      y: 60,
      width: 30,
      height: 40
    })

    const group = editor.graph.createNode('GROUP', pageId, { name: 'Group' })
    editor.graph.reparentNode(child1.id, group.id)
    editor.graph.reparentNode(child2.id, group.id)

    editor.select([group.id])
    return { editor, pageId, group, child1, child2 }
  }

  test('no-op when selectedNode is undefined', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id
    const before = editor.graph.getNode(pageId)?.childIds.length ?? 0

    editor.ungroupSelected(undefined)

    expect(editor.graph.getNode(pageId)?.childIds.length).toBe(before)
    expect(editor.undo.canUndo).toBe(false)
  })

  test('no-op when selectedNode is not a GROUP', () => {
    const editor = createEditor()
    const pageId = editor.graph.getPages()[0].id
    const rect = editor.graph.createNode('RECTANGLE', pageId, {
      name: 'Rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10
    })
    editor.select([rect.id])

    editor.ungroupSelected(rect)

    expect(editor.graph.getNode(rect.id)).toBeDefined()
    expect(editor.undo.canUndo).toBe(false)
  })

  test('promotes group children to parent and deletes the group', () => {
    const { editor, pageId, group, child1, child2 } = setupGroupWithChildren()

    editor.ungroupSelected(group)

    expect(editor.graph.getNode(group.id)).toBeUndefined()
    const page = getNodeOrThrow(editor.graph, pageId)
    expect(page.childIds).toContain(child1.id)
    expect(page.childIds).toContain(child2.id)
  })

  test('updates selection to the promoted children', () => {
    const { editor, group, child1, child2 } = setupGroupWithChildren()

    editor.ungroupSelected(group)

    expect(editor.state.selectedIds.has(child1.id)).toBe(true)
    expect(editor.state.selectedIds.has(child2.id)).toBe(true)
    expect(editor.state.selectedIds.has(group.id)).toBe(false)
  })

  test('undo restores the group and its children at original positions', () => {
    const { editor, group, child1, child2 } = setupGroupWithChildren()
    const origChild1Pos = { x: child1.x, y: child1.y }
    const origChild2Pos = { x: child2.x, y: child2.y }

    editor.ungroupSelected(group)
    editor.undo.undo()

    const restoredGroup = editor.graph.getNode(group.id)
    expect(restoredGroup?.type).toBe('GROUP')
    expect(restoredGroup?.childIds).toContain(child1.id)
    expect(restoredGroup?.childIds).toContain(child2.id)

    const c1 = getNodeOrThrow(editor.graph, child1.id)
    const c2 = getNodeOrThrow(editor.graph, child2.id)
    expect(c1.x).toBe(origChild1Pos.x)
    expect(c1.y).toBe(origChild1Pos.y)
    expect(c2.x).toBe(origChild2Pos.x)
    expect(c2.y).toBe(origChild2Pos.y)
  })

  test('redo re-applies the ungroup after undo', () => {
    const { editor, group, child1, child2 } = setupGroupWithChildren()

    editor.ungroupSelected(group)
    editor.undo.undo()
    editor.undo.redo()

    expect(editor.graph.getNode(group.id)).toBeUndefined()
    expect(editor.state.selectedIds.has(child1.id)).toBe(true)
    expect(editor.state.selectedIds.has(child2.id)).toBe(true)
  })
})
