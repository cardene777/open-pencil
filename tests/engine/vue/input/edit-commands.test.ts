import { describe, expect, test } from 'bun:test'
import { ref } from 'vue'

import { createEditCommands } from '#vue/editor/commands/edit'

interface FakeEditor {
  undoAction(): void
  redoAction(): void
}

function buildOptions(undoEnabled: boolean, redoEnabled: boolean) {
  let undoCount = 0
  let redoCount = 0
  const editor: FakeEditor = {
    undoAction: () => {
      undoCount += 1
    },
    redoAction: () => {
      redoCount += 1
    }
  }
  const capabilities = { canUndo: undoEnabled, canRedo: redoEnabled }
  const messages = ref({ undo: 'Undo', redo: 'Redo' })
  return {
    options: { editor, capabilities, messages } as Parameters<typeof createEditCommands>[0],
    getCounts: () => ({ undoCount, redoCount }),
    messages
  }
}

describe('createEditCommands', () => {
  test('exposes edit.undo and edit.redo commands with id/label/enabled', () => {
    const { options } = buildOptions(true, false)

    const commands = createEditCommands(options)

    expect(commands['edit.undo'].id).toBe('edit.undo')
    expect(commands['edit.undo'].label).toBe('Undo')
    expect(commands['edit.undo'].enabled).toBe(true)
    expect(commands['edit.redo'].id).toBe('edit.redo')
    expect(commands['edit.redo'].label).toBe('Redo')
    expect(commands['edit.redo'].enabled).toBe(false)
  })

  test('edit.undo.run delegates to editor.undoAction', () => {
    const { options, getCounts } = buildOptions(true, true)

    const commands = createEditCommands(options)
    commands['edit.undo'].run()

    expect(getCounts().undoCount).toBe(1)
    expect(getCounts().redoCount).toBe(0)
  })

  test('edit.redo.run delegates to editor.redoAction', () => {
    const { options, getCounts } = buildOptions(true, true)

    const commands = createEditCommands(options)
    commands['edit.redo'].run()

    expect(getCounts().redoCount).toBe(1)
    expect(getCounts().undoCount).toBe(0)
  })

  test('labels track i18n message ref reactively', () => {
    const { options, messages } = buildOptions(true, true)

    const commands = createEditCommands(options)
    messages.value = { undo: '元に戻す', redo: 'やり直す' }

    expect(commands['edit.undo'].label).toBe('元に戻す')
    expect(commands['edit.redo'].label).toBe('やり直す')
  })
})
