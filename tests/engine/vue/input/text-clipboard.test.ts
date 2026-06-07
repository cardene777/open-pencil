import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createTextClipboardActions } from '#vue/canvas/text-edit/clipboard'

interface FakeTextEditor {
  getSelectedText(): string
}

interface FakeStore {
  textEditor: FakeTextEditor | null
}

interface FakeNavigatorClipboard {
  writeText(text: string): Promise<void>
  readText(): Promise<string>
}

describe('createTextClipboardActions', () => {
  let originalNavigator: Navigator
  let originalConsoleWarn: typeof console.warn
  let writeCalls: string[]
  let readResult: string | Error
  let warnCalls: unknown[]

  beforeEach(() => {
    originalNavigator = globalThis.navigator
    originalConsoleWarn = console.warn
    writeCalls = []
    readResult = ''
    warnCalls = []
    const clip: FakeNavigatorClipboard = {
      writeText: (text: string) => {
        writeCalls.push(text)
        return Promise.resolve()
      },
      readText: async () => {
        if (readResult instanceof Error) {
          throw readResult
        }
        return readResult
      }
    }
    ;(globalThis as { navigator: { clipboard: FakeNavigatorClipboard } }).navigator = {
      clipboard: clip
    }
    console.warn = (...args: unknown[]) => {
      warnCalls.push(args)
    }
  })

  afterEach(() => {
    ;(globalThis as { navigator: Navigator }).navigator = originalNavigator
    console.warn = originalConsoleWarn
  })

  function build(selected: string, hasEditor: boolean) {
    const insertCalls: Array<{ text: string }> = []
    const deleteCalls: Array<{ forward: boolean }> = []
    let resetCount = 0
    const editor: FakeTextEditor | null = hasEditor
      ? { getSelectedText: () => selected }
      : null
    const store: FakeStore = { textEditor: editor }
    const actions = createTextClipboardActions({
      store: store as never,
      insertText: (text) => insertCalls.push({ text }),
      deleteText: (_node, forward) => deleteCalls.push({ forward }),
      resetBlink: () => {
        resetCount += 1
      }
    })
    return {
      actions,
      get insertCalls() { return insertCalls },
      get deleteCalls() { return deleteCalls },
      get resetCount() { return resetCount }
    }
  }

  test('handleCopy writes selected text to clipboard when text editor exists', () => {
    const { actions } = build('hello', true)
    actions.handleCopy()
    expect(writeCalls).toEqual(['hello'])
  })

  test('handleCopy is a no-op when text editor is missing', () => {
    const { actions } = build('hello', false)
    actions.handleCopy()
    expect(writeCalls).toEqual([])
  })

  test('handleCopy skips when selection is empty', () => {
    const { actions } = build('', true)
    actions.handleCopy()
    expect(writeCalls).toEqual([])
  })

  test('handleCut writes text + delete + resetBlink when editor and node present', () => {
    const ctx = build('abc', true)
    const node = { id: 'n1' } as never
    ctx.actions.handleCut(node)
    expect(writeCalls).toEqual(['abc'])
    expect(ctx.deleteCalls).toEqual([{ forward: false }])
    expect(ctx.resetCount).toBe(1)
  })

  test('handleCut is a no-op when node is null', () => {
    const ctx = build('abc', true)
    ctx.actions.handleCut(null)
    expect(writeCalls).toEqual([])
    expect(ctx.deleteCalls).toEqual([])
  })

  test('handlePaste reads text and inserts + resetBlink on success', async () => {
    const ctx = build('', true)
    readResult = 'pasted'
    await ctx.actions.handlePaste({ id: 'n1' } as never)
    expect(ctx.insertCalls).toEqual([{ text: 'pasted' }])
    expect(ctx.resetCount).toBe(1)
  })

  test('handlePaste skips insert when clipboard text is empty', async () => {
    const ctx = build('', true)
    readResult = ''
    await ctx.actions.handlePaste({ id: 'n1' } as never)
    expect(ctx.insertCalls).toEqual([])
    expect(ctx.resetCount).toBe(0)
  })

  test('handlePaste logs warning when clipboard read throws', async () => {
    const ctx = build('', true)
    readResult = new Error('denied')
    await ctx.actions.handlePaste({ id: 'n1' } as never)
    expect(warnCalls.length).toBe(1)
    expect(ctx.insertCalls).toEqual([])
  })
})
