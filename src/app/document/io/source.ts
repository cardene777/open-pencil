import { watch } from 'vue'

import type { Editor, EditorState } from '@inkly/core/editor'
import { exportFigFile } from '@inkly/core/io/formats/fig'
import { perfTracer } from '@inkly/core/profiler'

import { createAutosave } from '@/app/document/autosave'
import {
  type BytesFingerprint,
  fingerprint,
  fingerprintEquals
} from '@/app/document/autosave/bytes-hash'
import { createThrottleScheduler } from '@/app/document/autosave/throttle-scheduler'
import {
  documentNameFromFigPath,
  downloadNameFromPath,
  figDownloadName
} from '@/app/document/io/names'
import { savePenToCache } from '@/app/document/io/pen-cache'
import { createSaveActions } from '@/app/document/io/save'
import { createDocumentSourceState } from '@/app/document/io/source-state'

type DocumentSourceState = EditorState & {
  documentName: string
  autosaveEnabled: boolean
  autosaveStatus?: 'idle' | 'saving' | 'saved'
}

export { createDocumentSourceState }

type DocumentSourceOptions = {
  editor: Editor
  state: DocumentSourceState
  stopWatchingFile: () => void
  startWatchingFile: () => Promise<void>
  getFileHandle: () => FileSystemFileHandle | null
  setFileHandle: (handle: FileSystemFileHandle | null) => void
  getFilePath: () => string | null
  setFilePath: (path: string | null) => void
  getDownloadName: () => string | null
  setDownloadName: (name: string | null) => void
  getSavedVersion: () => number
  setSavedVersion: (version: number) => void
  setLastWriteTime: (time: number) => void
  getRenderer: () => Editor['renderer']
}

export function createDocumentSourceActions({
  editor,
  state,
  stopWatchingFile,
  startWatchingFile,
  getFileHandle,
  setFileHandle,
  getFilePath,
  setFilePath,
  getDownloadName,
  setDownloadName,
  getSavedVersion,
  setSavedVersion,
  setLastWriteTime,
  getRenderer
}: DocumentSourceOptions) {
  function buildFigFile() {
    return exportFigFile(editor.graph, undefined, getRenderer() ?? undefined, state.currentPageId)
  }

  const { saveFigFile, saveFigFileAs, writeFile } = createSaveActions({
    state,
    buildFigFile,
    getFilePath,
    setFilePath,
    getFileHandle,
    setFileHandle,
    getDownloadName,
    setDownloadName,
    setSavedVersion,
    setLastWriteTime,
    startWatchingFile: () => {
      void startWatchingFile()
    }
  })

  const { disposeAutosave } = createAutosave({
    state,
    getSavedVersion,
    hasWritableSource: () => !!getFileHandle() || !!getFilePath(),
    saveCurrentDocument: async () => writeFile(await buildFigFile())
  })

  let lastCachedVersion = state.sceneVersion
  let lastCachedFingerprint: BytesFingerprint | null = null
  let savedResetTimer: ReturnType<typeof setTimeout> | null = null
  const runOnIdle = (cb: () => void): void => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback
    if (typeof ric === 'function') ric(cb)
    else setTimeout(cb, 0)
  }

  async function runAutosave(version: number): Promise<void> {
    if (version === lastCachedVersion) return
    await new Promise<void>((resolve) => runOnIdle(resolve))
    if (version === lastCachedVersion) return
    const endTotal = perfTracer.mark('autosave:total', 'IO', { version })
    state.autosaveStatus = 'saving'
    try {
      const bytes = await perfTracer.measureAsync(
        'autosave:encode',
        'IO',
        () => buildFigFile(),
        { version }
      )
      const nextFingerprint = perfTracer.measure(
        'autosave:fingerprint',
        'IO',
        () => fingerprint(bytes),
        { version, bytes: bytes.byteLength }
      )
      if (fingerprintEquals(lastCachedFingerprint, nextFingerprint)) {
        lastCachedVersion = version
        state.autosaveStatus = 'saved'
        if (savedResetTimer) clearTimeout(savedResetTimer)
        savedResetTimer = setTimeout(() => {
          state.autosaveStatus = 'idle'
        }, 2000)
        return
      }
      const cacheName = getDownloadName() ?? `${state.documentName}.fig`
      // URL から board id を抽出 (/board/:id 形式)、 board に紐付かない場合は 'latest' fallback
      const boardMatch = typeof window !== 'undefined'
        ? window.location.pathname.match(/^\/board\/([^/]+)/)
        : null
      const boardId = boardMatch?.[1] ?? null
      await perfTracer.measureAsync(
        'autosave:write',
        'IO',
        () => savePenToCache(cacheName, 'application/octet-stream', bytes, boardId),
        { version, bytes: bytes.byteLength }
      )
      lastCachedFingerprint = nextFingerprint
      lastCachedVersion = version
      state.autosaveStatus = 'saved'
      if (savedResetTimer) clearTimeout(savedResetTimer)
      savedResetTimer = setTimeout(() => {
        state.autosaveStatus = 'idle'
      }, 2000)
    } catch (e) {
      console.warn('IndexedDB autosave failed:', e)
      state.autosaveStatus = 'idle'
    } finally {
      endTotal()
    }
  }

  const autosaveScheduler = createThrottleScheduler<number>(runAutosave, {
    debounceMs: 3000,
    minIntervalMs: 5000,
    maxDelayMs: 30000
  })

  const stopIndexedDBAutosave = watch(
    () => state.sceneVersion,
    (version) => {
      if (version === lastCachedVersion) return
      autosaveScheduler.schedule(version)
    }
  )

  function setDocumentSource(
    fileName: string,
    sourceFormat: string,
    handle?: FileSystemFileHandle,
    path?: string
  ) {
    stopWatchingFile()
    const isFig = sourceFormat === 'fig'
    setFileHandle(isFig ? (handle ?? null) : null)
    setFilePath(isFig ? (path ?? null) : null)
    setDownloadName(figDownloadName(fileName, sourceFormat))
    setSavedVersion(state.sceneVersion)
    if (isFig && (handle || path)) {
      void startWatchingFile()
    }
  }

  function setPlannedFilePath(path: string) {
    stopWatchingFile()
    setFileHandle(null)
    setFilePath(path)
    const downloadName = downloadNameFromPath(path)
    setDownloadName(downloadName)
    state.documentName = documentNameFromFigPath(downloadName)
  }

  function startWatchingCurrentFile() {
    void startWatchingFile()
  }

  function disposeDocumentIO() {
    stopWatchingFile()
    disposeAutosave()
    stopIndexedDBAutosave()
    autosaveScheduler.cancel()
  }

  return {
    setDocumentSource,
    setPlannedFilePath,
    startWatchingCurrentFile,
    disposeDocumentIO,
    saveFigFile,
    saveFigFileAs
  }
}
