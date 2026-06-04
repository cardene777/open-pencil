import { expect, test } from 'bun:test'
import * as Y from 'yjs'

import { SceneGraph } from '#core/scene-graph'

import { syncNodePropsToYMap } from '@/app/collab/yjs-sync'

function createFixture() {
  const graph = new SceneGraph()
  const page = graph.addPage('P')
  const leaf = graph.createNode('RECTANGLE', page.id, {
    name: 'Leaf',
    width: 100,
    height: 50,
    x: 10,
    y: 20
  })
  const ydoc = new Y.Doc()
  const ynode = ydoc.getMap('test') as Y.Map<unknown>

  return { graph, page, leaf, ydoc, ynode }
}

test('TC1 syncNodePropsToYMap sets all node properties when changedKeys is omitted', () => {
  // Given
  const { leaf, ynode } = createFixture()
  leaf.name = 'TC1'

  // When
  syncNodePropsToYMap(leaf, ynode)

  // Then
  expect(ynode.get('id')).toBe(leaf.id)
  expect(ynode.get('x')).toBe(10)
  expect(ynode.get('y')).toBe(20)
  expect(ynode.get('width')).toBe(100)
  expect(ynode.get('height')).toBe(50)
  expect(ynode.get('name')).toBe('TC1')
  expect(ynode.get('childIds')).toBe('[]')
})

test('TC2 syncNodePropsToYMap only patches the requested keys', () => {
  // Given
  const { leaf, ynode } = createFixture()
  leaf.name = 'Before'
  ynode.set('x', 999)
  ynode.set('y', 999)
  ynode.set('width', 999)
  ynode.set('height', 999)
  ynode.set('name', 'Stale')

  // When
  leaf.x = 50
  leaf.y = 60
  syncNodePropsToYMap(leaf, ynode, ['x', 'y'])

  // Then
  expect(ynode.get('x')).toBe(50)
  expect(ynode.get('y')).toBe(60)
  expect(ynode.get('width')).toBe(999)
  expect(ynode.get('height')).toBe(999)
  expect(ynode.get('name')).toBe('Stale')
})

test('TC3 syncNodePropsToYMap skips missing keys in changedKeys', () => {
  // Given
  const { leaf, ynode } = createFixture()
  leaf.name = 'TC3'
  ynode.set('name', 'Original')
  ynode.set('x', 999)

  // When
  syncNodePropsToYMap(leaf, ynode, ['name', 'nonExistentKey'])

  // Then
  expect(ynode.get('name')).toBe('TC3')
  expect(ynode.get('x')).toBe(999)
  expect(ynode.has('nonExistentKey')).toBe(false)
})

test('TC4 syncNodePropsToYMap is a no-op when changedKeys is empty', () => {
  // Given
  const { leaf, ynode } = createFixture()
  ynode.set('x', 100)

  // When
  syncNodePropsToYMap(leaf, ynode, [])

  // Then
  expect(ynode.get('x')).toBe(100)
  expect(ynode.size).toBe(1)
})
