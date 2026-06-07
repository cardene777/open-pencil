import { describe, expect, test } from 'bun:test'

import { createEditor } from '@inkly/core/editor'
import type { SceneNode } from '@inkly/core/scene-graph'

import { resolveHit } from '#vue/shared/input/select/hit'
import type { HitTestFns } from '#vue/shared/input/select'

function fakeNode(id: string): SceneNode {
  const proxy = { id, type: 'RECTANGLE', name: id } as Partial<SceneNode>
  return proxy as SceneNode
}

function buildFns(overrides: Partial<HitTestFns> = {}): HitTestFns {
  return {
    hitTestInScope: () => null,
    isInsideContainerBounds: () => false,
    hitTestSectionTitle: () => null,
    hitTestComponentLabel: () => null,
    hitTestFrameTitle: () => null,
    ...overrides
  }
}

describe('resolveHit', () => {
  test('returns frame title hit when available, ignoring scope hits', () => {
    const editor = createEditor()
    const frame = fakeNode('frame-title')
    const scope = fakeNode('scope-hit')
    const fns = buildFns({
      hitTestFrameTitle: () => frame,
      hitTestInScope: () => scope
    })

    expect(resolveHit(0, 0, editor, fns)).toBe(frame)
  })

  test('falls back to section title when frame title misses', () => {
    const editor = createEditor()
    const section = fakeNode('section-title')
    const fns = buildFns({ hitTestSectionTitle: () => section })

    expect(resolveHit(0, 0, editor, fns)).toBe(section)
  })

  test('falls back to component label when frame and section title miss', () => {
    const editor = createEditor()
    const component = fakeNode('component-label')
    const fns = buildFns({ hitTestComponentLabel: () => component })

    expect(resolveHit(0, 0, editor, fns)).toBe(component)
  })

  test('returns in-scope hit when no title hits exist', () => {
    const editor = createEditor()
    const node = fakeNode('scope-hit')
    const fns = buildFns({ hitTestInScope: () => node })

    expect(resolveHit(0, 0, editor, fns)).toBe(node)
  })

  test('returns null when no scope is entered and no hits found', () => {
    const editor = createEditor()
    const fns = buildFns()

    expect(resolveHit(0, 0, editor, fns)).toBeNull()
  })

  test('clears selection and returns null when click is inside entered container bounds', () => {
    const editor = createEditor()
    editor.state.enteredContainerId = 'container-1'
    let cleared = 0
    editor.clearSelection = () => {
      cleared += 1
    }
    const fns = buildFns({ isInsideContainerBounds: () => true })

    const result = resolveHit(50, 50, editor, fns)

    expect(result).toBeNull()
    expect(cleared).toBe(1)
  })

  test('exits container and returns post-exit scope hit when click is outside container bounds', () => {
    const editor = createEditor()
    editor.state.enteredContainerId = 'container-1'
    let exitCalls = 0
    editor.exitContainer = () => {
      exitCalls += 1
      editor.state.enteredContainerId = null
    }
    const postExit = fakeNode('post-exit')
    let inScopeCalls = 0
    const fns = buildFns({
      hitTestInScope: () => {
        inScopeCalls += 1
        return inScopeCalls === 2 ? postExit : null
      }
    })

    const result = resolveHit(10, 10, editor, fns)

    expect(exitCalls).toBe(1)
    expect(result).toBe(postExit)
  })

  test('chained exitContainer when entered container is still set after first exit + no hit', () => {
    const editor = createEditor()
    editor.state.enteredContainerId = 'outer'
    let exitCalls = 0
    editor.exitContainer = () => {
      exitCalls += 1
    }
    const fns = buildFns()

    const result = resolveHit(10, 10, editor, fns)

    expect(result).toBeNull()
    expect(exitCalls).toBe(2)
  })
})
