import { DEFAULT_TEXT_HEIGHT, DEFAULT_TEXT_WIDTH } from '@inkly/core/constants'
import type { Editor } from '@inkly/core/editor'
import {
  createStickyNote,
  STICKY_NOTE_DEFAULT_HEIGHT,
  STICKY_NOTE_DEFAULT_WIDTH
} from '@inkly/core/scene-graph'

import { TOOL_TO_NODE } from '#vue/shared/input/types'
import type { DragDraw, DragState } from '#vue/shared/input/types'

export function startTextTool(cx: number, cy: number, editor: Editor) {
  const nodeId = editor.createShape('TEXT', cx, cy, DEFAULT_TEXT_WIDTH, DEFAULT_TEXT_HEIGHT)
  editor.graph.updateNode(nodeId, { text: '' })
  editor.select([nodeId])
  editor.startTextEditing(nodeId)
  editor.setTool('SELECT')
  editor.requestRender()
}

/**
 * Sticky note tool ... canvas 上の click 位置を中心に 240x240 の付箋を作成、
 * 即時に text 編集モードへ遷移する。 collab 経路は `editor.graph.updateNode`
 * を経由するため yjs sync で他 client にも broadcast される。
 *
 * miro 互換 ... click 1 回で作成完了、 drag の概念なし、 デフォルト yellow。
 * 色変更は properties panel に表示される sticky color picker から行う。
 */
export function startStickyTool(cx: number, cy: number, editor: Editor) {
  // click 位置を中心とする
  const x = cx - STICKY_NOTE_DEFAULT_WIDTH / 2
  const y = cy - STICKY_NOTE_DEFAULT_HEIGHT / 2
  const { rectId, textId } = editor.undo.runBatch('Create sticky note', () =>
    createStickyNote(editor.graph, editor.state.currentPageId, {
      x,
      y,
      color: 'yellow'
    })
  )
  editor.select([rectId])
  // 中身を即時編集できるよう child TEXT を edit mode に
  editor.startTextEditing(textId)
  editor.setTool('SELECT')
  editor.requestRender()
}

export function startShapeDraw(
  cx: number,
  cy: number,
  editor: Editor,
  setDrag: (d: DragState) => void
) {
  const nodeType = TOOL_TO_NODE[editor.state.activeTool]
  if (!nodeType) return

  editor.undo.beginBatch('Create shape')
  const nodeId = editor.createShape(nodeType, cx, cy, 0, 0)
  editor.select([nodeId])
  setDrag({ type: 'draw', startX: cx, startY: cy, nodeId })
}

export function handleDrawMove(
  d: DragDraw,
  cx: number,
  cy: number,
  shiftKey: boolean,
  editor: Editor
) {
  let w = cx - d.startX
  let h = cy - d.startY

  if (shiftKey) {
    const size = Math.max(Math.abs(w), Math.abs(h))
    w = Math.sign(w) * size
    h = Math.sign(h) * size
  }

  editor.updateNode(d.nodeId, {
    x: w < 0 ? d.startX + w : d.startX,
    y: h < 0 ? d.startY + h : d.startY,
    width: Math.abs(w),
    height: Math.abs(h)
  })
}

export function handleDrawUp(d: DragDraw, editor: Editor) {
  const node = editor.graph.getNode(d.nodeId)
  if (node && node.width < 2 && node.height < 2) {
    editor.updateNode(d.nodeId, { width: 100, height: 100 })
  }
  if (node?.type === 'SECTION') {
    editor.adoptNodesIntoSection(node.id)
  }
  editor.commitResize(d.nodeId, { x: d.startX, y: d.startY, width: 0, height: 0 })
  editor.undo.commitBatch()
  editor.setTool('SELECT')
}
