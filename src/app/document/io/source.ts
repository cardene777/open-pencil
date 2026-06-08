import { watch } from 'vue'

import type { Editor, EditorState } from '@inkly/core/editor'
import { exportFigFile } from '@inkly/core/io/formats/fig'
import { perfTracer } from '@inkly/core/profiler'

import { encodeBoardContentBytes, savePageContent } from '@/app/api/client'
import { createAutosave } from '@/app/document/autosave'
import {
  type BytesFingerprint,
  fingerprint,
  fingerprintEquals
} from '@/app/document/autosave/bytes-hash'
import {
  documentNameFromFigPath,
  downloadNameFromPath,
  figDownloadName
} from '@/app/document/io/names'
import { createSaveActions } from '@/app/document/io/save'
import { createDocumentSourceState } from '@/app/document/io/source-state'
import { getActiveBoardPageContext } from '@/app/pages'

const REMOTE_AUTOSAVE_DEBOUNCE_MS = 5000

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

  let lastRemoteVersion = state.sceneVersion
  const lastRemoteSavedFingerprintByPageId = new Map<string, BytesFingerprint>()
  let savedResetTimer: ReturnType<typeof setTimeout> | null = null
  let remoteAutosaveTimer: ReturnType<typeof setTimeout> | null = null
  const runOnIdle = (cb: () => void): void => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback
    if (typeof ric === 'function') ric(cb)
    else setTimeout(cb, 0)
  }

  function clearAutosaveTimers() {
    if (remoteAutosaveTimer) clearTimeout(remoteAutosaveTimer)
    if (savedResetTimer) clearTimeout(savedResetTimer)
    remoteAutosaveTimer = null
    savedResetTimer = null
  }

  async function flushRemotePageAutosave(version: number): Promise<void> {
    const context = getActiveBoardPageContext()
    if (!context) {
      state.autosaveStatus = 'idle'
      return
    }

    await new Promise<void>((resolve) => runOnIdle(resolve))
    if (version !== state.sceneVersion) return

    const endTotal = perfTracer.mark('autosave:total', 'IO', { version })
    state.autosaveStatus = 'saving'
    try {
      const bytes = await perfTracer.measureAsync(
        'autosave:encode:board',
        'IO',
        () => buildFigFile(),
        { version }
      )
      const nextFingerprint = perfTracer.measure(
        'autosave:fingerprint:page',
        'IO',
        () => fingerprint(bytes),
        { version, bytes: bytes.byteLength }
      )
      const lastRemoteSavedFingerprint =
        lastRemoteSavedFingerprintByPageId.get(context.pageId) ?? null
      if (fingerprintEquals(lastRemoteSavedFingerprint, nextFingerprint)) {
        lastRemoteVersion = version
        state.autosaveStatus = 'saved'
        if (savedResetTimer) clearTimeout(savedResetTimer)
        savedResetTimer = setTimeout(() => {
          state.autosaveStatus = 'idle'
        }, 2000)
        return
      }
      if (version !== state.sceneVersion) return

      const content = encodeBoardContentBytes(bytes)
      await savePageContent(context.boardId, context.pageId, content)
      lastRemoteSavedFingerprintByPageId.set(context.pageId, nextFingerprint)
      lastRemoteVersion = version
      state.autosaveStatus = 'saved'
      if (savedResetTimer) clearTimeout(savedResetTimer)
      savedResetTimer = setTimeout(() => {
        state.autosaveStatus = 'idle'
      }, 2000)
    } catch (error) {
      console.warn('Page DB autosave failed:', error)
      state.autosaveStatus = 'idle'
    } finally {
      endTotal()
    }
  }

  function scheduleRemotePageAutosave(version: number) {
    if (!getActiveBoardPageContext()) return
    if (remoteAutosaveTimer) clearTimeout(remoteAutosaveTimer)
    remoteAutosaveTimer = setTimeout(() => {
      remoteAutosaveTimer = null
      void flushRemotePageAutosave(version)
    }, REMOTE_AUTOSAVE_DEBOUNCE_MS)
  }

  const stopRemoteAutosave = watch(
    () => state.sceneVersion,
    (version) => {
      if (version === lastRemoteVersion) return
      scheduleRemotePageAutosave(version)
    }
  )

  async function flushRemotePageAutosaveNow() {
    if (remoteAutosaveTimer) {
      clearTimeout(remoteAutosaveTimer)
      remoteAutosaveTimer = null
    }
    await flushRemotePageAutosave(state.sceneVersion)
  }

  async function syncRemotePageAutosaveBaseline(pageId: string, bytes?: Uint8Array | null) {
    const baselineBytes = bytes ?? (await buildFigFile())
    lastRemoteSavedFingerprintByPageId.set(pageId, fingerprint(baselineBytes))
    lastRemoteVersion = state.sceneVersion
    state.autosaveStatus = 'idle'
    if (remoteAutosaveTimer) {
      clearTimeout(remoteAutosaveTimer)
      remoteAutosaveTimer = null
    }
  }

  function resetRemotePageAutosaveState() {
    clearAutosaveTimers()
    lastRemoteSavedFingerprintByPageId.clear()
    lastRemoteVersion = state.sceneVersion
    state.autosaveStatus = 'idle'
  }

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
    stopRemoteAutosave()
    clearAutosaveTimers()
  }

  return {
    setDocumentSource,
    setPlannedFilePath,
    startWatchingCurrentFile,
    disposeDocumentIO,
    flushRemotePageAutosaveNow,
    syncRemotePageAutosaveBaseline,
    resetRemotePageAutosaveState,
    saveFigFile,
    saveFigFileAs
  }
}
