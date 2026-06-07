import { describe, expect, test } from 'bun:test'

import { createEditor } from '@inkly/core/editor'

import { handlePanMove } from '#vue/canvas/transform-input/pan'
import { startPanDrag } from '#vue/shared/input/pan'
import type { DragPan, DragState } from '#vue/shared/input/types'

function fakeMouseEvent(x: number, y: number): MouseEvent {
  return { clientX: x, clientY: y } as MouseEvent
}

describe('startPanDrag', () => {
  test('captures current screen coords and editor pan state into the drag snapshot', () => {
    const editor = createEditor()
    editor.state.panX = 50
    editor.state.panY = -20
    let captured: DragState | null = null
    const setDrag = (d: DragState) => {
      captured = d
    }

    startPanDrag(fakeMouseEvent(120, 200), setDrag, editor)

    expect(captured).toEqual({
      type: 'pan',
      startScreenX: 120,
      startScreenY: 200,
      startPanX: 50,
      startPanY: -20
    })
  })
})

describe('handlePanMove', () => {
  test('updates editor panX/panY using delta from start screen coords', () => {
    const editor = createEditor()
    let repaintCount = 0
    editor.requestRepaint = () => {
      repaintCount += 1
    }
    const drag: DragPan = {
      type: 'pan',
      startScreenX: 100,
      startScreenY: 100,
      startPanX: 30,
      startPanY: -10
    }

    handlePanMove(editor, drag, fakeMouseEvent(150, 80))

    expect(editor.state.panX).toBe(30 + 50)
    expect(editor.state.panY).toBe(-10 + (-20))
    expect(repaintCount).toBe(1)
  })

  test('handles zero-delta move without changing pan state', () => {
    const editor = createEditor()
    let repaintCount = 0
    editor.requestRepaint = () => {
      repaintCount += 1
    }
    const drag: DragPan = {
      type: 'pan',
      startScreenX: 50,
      startScreenY: 60,
      startPanX: 10,
      startPanY: 20
    }

    handlePanMove(editor, drag, fakeMouseEvent(50, 60))

    expect(editor.state.panX).toBe(10)
    expect(editor.state.panY).toBe(20)
    expect(repaintCount).toBe(1)
  })
})
