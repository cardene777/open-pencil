import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { buildCsv, escapeCsvField, triggerCsvDownload } from '@/app/shell/csv-export'

describe('escapeCsvField', () => {
  test('passes through plain values', () => {
    expect(escapeCsvField('hello')).toBe('hello')
    expect(escapeCsvField(42)).toBe('42')
  })

  test('wraps values containing commas in double quotes', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"')
  })

  test('escapes internal double quotes by doubling them', () => {
    expect(escapeCsvField('he said "hi"')).toBe('"he said ""hi"""')
  })

  test('wraps values containing newlines in double quotes', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })
})

describe('buildCsv', () => {
  test('joins header and rows with newlines and commas', () => {
    const csv = buildCsv({
      header: ['Id', 'Name'],
      rows: [
        [1, 'Alice'],
        [2, 'Bob']
      ]
    })
    expect(csv).toBe('Id,Name\n1,Alice\n2,Bob')
  })

  test('escapes every cell consistently', () => {
    const csv = buildCsv({
      header: ['A,B', 'C'],
      rows: [['hello\nworld', 'plain']]
    })
    expect(csv).toBe('"A,B",C\n"hello\nworld",plain')
  })
})

describe('triggerCsvDownload', () => {
  let originalWindow: typeof globalThis.window | undefined
  let originalDocument: typeof globalThis.document | undefined
  let clickMock: ReturnType<typeof mock>
  let appendMock: ReturnType<typeof mock>
  let removeMock: ReturnType<typeof mock>
  let createObjectUrlMock: ReturnType<typeof mock>
  let revokeObjectUrlMock: ReturnType<typeof mock>
  let createdAnchor: { href: string; download: string }

  beforeEach(() => {
    originalWindow = (globalThis as { window?: typeof globalThis.window }).window
    originalDocument = (globalThis as { document?: typeof globalThis.document }).document

    clickMock = mock(() => {})
    appendMock = mock(() => {})
    removeMock = mock(() => {})
    createObjectUrlMock = mock(() => 'blob:mock-url')
    revokeObjectUrlMock = mock(() => {})

    createdAnchor = { href: '', download: '' }

    ;(globalThis as { window: unknown }).window = {
      URL: {
        createObjectURL: createObjectUrlMock,
        revokeObjectURL: revokeObjectUrlMock
      }
    }
    ;(globalThis as { URL: unknown }).URL = {
      createObjectURL: createObjectUrlMock,
      revokeObjectURL: revokeObjectUrlMock
    }
    ;(globalThis as { document: unknown }).document = {
      createElement: (tag: string) => {
        if (tag === 'a') {
          createdAnchor = {
            href: '',
            download: '',
            click: clickMock
          } as unknown as { href: string; download: string }
          return createdAnchor
        }
        return {}
      },
      body: {
        appendChild: appendMock,
        removeChild: removeMock
      }
    }
  })

  afterEach(() => {
    if (originalWindow !== undefined) {
      ;(globalThis as { window: unknown }).window = originalWindow
    } else {
      delete (globalThis as { window?: unknown }).window
    }
    if (originalDocument !== undefined) {
      ;(globalThis as { document: unknown }).document = originalDocument
    } else {
      delete (globalThis as { document?: unknown }).document
    }
    delete (globalThis as { URL?: unknown }).URL
  })

  test('triggers a download and returns row count', () => {
    const count = triggerCsvDownload({
      header: ['A', 'B'],
      rows: [
        [1, 2],
        [3, 4]
      ],
      filename: 'test.csv'
    })
    expect(count).toBe(2)
    expect(clickMock).toHaveBeenCalledTimes(1)
    expect(appendMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledTimes(1)
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlMock).toHaveBeenCalledTimes(1)
    expect(createdAnchor.download).toBe('test.csv')
    expect(createdAnchor.href).toBe('blob:mock-url')
  })

  test('returns 0 when window is undefined', () => {
    delete (globalThis as { window?: unknown }).window
    const count = triggerCsvDownload({
      header: ['A'],
      rows: [[1]],
      filename: 'noop.csv'
    })
    expect(count).toBe(0)
  })
})
