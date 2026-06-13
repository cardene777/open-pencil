import { shallowRef } from 'vue'

import type { Board } from '@/app/api/client'

export const activeBoard = shallowRef<Board | null>(null)

export function setActiveBoard(board: Board | null) {
  activeBoard.value = board
}

export function patchActiveBoard(patch: Partial<Board>) {
  const current = activeBoard.value
  if (!current) return
  activeBoard.value = { ...current, ...patch }
}

export function clearActiveBoard(boardId?: string | null) {
  if (!activeBoard.value) return
  if (boardId && activeBoard.value.id !== boardId) return
  activeBoard.value = null
}
