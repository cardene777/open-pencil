import type { EditorContext } from '#core/editor/types'

export function createStructureStateActions(ctx: EditorContext) {
  function toggleNodeVisibility(id: string) {
    const node = ctx.graph.getNode(id)
    if (!node) return
    const nextVisible = !node.visible
    ctx.graph.updateNode(id, { visible: nextVisible })
    // visible: false にした node が selected の場合、 selection を解除する
    // (selection outline / handle が残像のように残るのを防ぐ、 図形 hide 後の
    // UX 改善)。 visible: true への変更では selection を温存。
    if (!nextVisible && ctx.state.selectedIds.has(id)) {
      const next = new Set(ctx.state.selectedIds)
      next.delete(id)
      ctx.state.selectedIds = next
    }
  }

  function toggleNodeLock(id: string) {
    const node = ctx.graph.getNode(id)
    if (!node) return
    ctx.graph.updateNode(id, { locked: !node.locked })
  }

  function toggleVisibility() {
    for (const id of ctx.state.selectedIds) toggleNodeVisibility(id)
  }

  function toggleLock() {
    for (const id of ctx.state.selectedIds) toggleNodeLock(id)
  }

  return { toggleNodeVisibility, toggleNodeLock, toggleVisibility, toggleLock }
}
