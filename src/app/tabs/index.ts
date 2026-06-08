import { computed, shallowRef } from 'vue'

import { BUILTIN_IO_FORMATS, IORegistry } from '@inkly/core/io'
import { readFigFile } from '@inkly/core/io/formats/fig'
import { computeAllLayouts } from '@inkly/core/layout'
import type { SceneGraph } from '@inkly/core/scene-graph'
import { fontManager } from '@inkly/core/text/fonts'

import { setInklyStore } from '@/app/browser-bridge'
import { setActiveEditorStore } from '@/app/editor/active-store'
import { createEditorStore } from '@/app/editor/session'
import type { EditorStore } from '@/app/editor/session'

export interface Tab {
  id: string
  store: EditorStore
}

const io = new IORegistry(BUILTIN_IO_FORMATS)

function weightToStyleName(weight: number): string {
  if (weight <= 100) return 'Thin'
  if (weight <= 200) return 'ExtraLight'
  if (weight <= 300) return 'Light'
  if (weight <= 400) return 'Regular'
  if (weight <= 500) return 'Medium'
  if (weight <= 600) return 'SemiBold'
  if (weight <= 700) return 'Bold'
  if (weight <= 800) return 'ExtraBold'
  return 'Black'
}

function collectExtraFontStyles(graph: SceneGraph): Array<[string, string]> {
  const seen = new Set<string>()
  const result: Array<[string, string]> = []

  for (const node of graph.getAllNodes()) {
    if (node.type !== 'TEXT') continue
    const family = node.fontFamily
    if (!family || family === 'lucide' || family === 'Material Symbols Sharp') continue
    const style = weightToStyleName(node.fontWeight ?? 400)
    const key = `${family}|${style}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push([family, style])
  }

  const defaultFonts: Array<[string, string[]]> = [
    ['Noto Sans JP', ['Regular', 'Bold']],
    ['Inter', ['Regular', 'Medium', 'SemiBold', 'Bold']]
  ]
  for (const [family, styles] of defaultFonts) {
    for (const style of styles) {
      const key = `${family}|${style}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push([family, style])
    }
  }

  return result
}

let nextTabId = 1
const activeTabRef = shallowRef<Tab | null>(null)

function generateTabId(): string {
  return `tab-${nextTabId++}`
}

function activateTab(tab: Tab) {
  activeTabRef.value = tab
  setActiveEditorStore(tab.store)
  setInklyStore(tab.store)
}

function disposeTab(tab: Tab | null) {
  tab?.store.dispose()
}

function ensureActiveTab(): Tab {
  if (activeTabRef.value) return activeTabRef.value
  return createTab()
}

export const activeTab = computed(() => activeTabRef.value)

export const allTabs = computed(() => {
  const tab = activeTabRef.value
  if (!tab) return []
  return [
    {
      id: tab.id,
      name: tab.store.state.documentName,
      isActive: true
    }
  ]
})

export function getActiveStore(): EditorStore {
  return ensureActiveTab().store
}

export function createTab(store?: EditorStore, initialGraph?: SceneGraph): Tab {
  const nextStore = store ?? createEditorStore(initialGraph)
  const tab: Tab = { id: generateTabId(), store: nextStore }
  const previous = activeTabRef.value
  activateTab(tab)
  if (previous && previous.id !== tab.id) disposeTab(previous)
  return tab
}

export function switchTab(tabId: string) {
  if (activeTabRef.value?.id === tabId) return
}

export function resetAllTabs(): Tab {
  const previous = activeTabRef.value
  activeTabRef.value = null
  disposeTab(previous)
  return createTab()
}

export function closeTab(tabId: string) {
  if (activeTabRef.value?.id !== tabId) return
  const previous = activeTabRef.value
  activeTabRef.value = null
  disposeTab(previous)
  createTab()
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export async function openFileInNewTab(
  file: File,
  handle?: FileSystemFileHandle,
  path?: string
): Promise<void> {
  const current = activeTabRef.value
  const isUntouched =
    current?.store.state.documentName === 'Untitled' && !current.store.undo.canUndo
  const store = isUntouched ? current.store : createTab().store
  const documentName = file.name.replace(/\.[^.]+$/i, '')

  store.state.documentName = documentName
  store.state.loading = true
  await yieldToUI()

  try {
    const isFig = file.name.toLowerCase().endsWith('.fig')
    const { graph: imported, sourceFormat } = isFig
      ? { graph: await readFigFile(file, { populate: 'first-page' }), sourceFormat: 'fig' }
      : await io.readDocument({
          name: file.name,
          mimeType: file.type || undefined,
          data: new Uint8Array(await file.arrayBuffer())
        })

    const cjkPromise = fontManager.ensureCJKFallback().catch(() => [])

    store.replaceGraph(imported)
    store.undo.clear()
    store.setDocumentSource(file.name, sourceFormat, handle, path)
    store.clearSelection()

    const allNodeIds = imported.getPages().flatMap((page) => page.childIds)
    const extraFonts = collectExtraFontStyles(imported)

    const fontPromise = Promise.all([
      cjkPromise,
      store.loadFontsForNodes(allNodeIds).catch(() => []),
      ...extraFonts.map(([family, style]) => fontManager.loadFont(family, style).catch(() => null)),
      fontManager.loadFont('lucide', 'Regular').catch(() => null)
    ])
    fontPromise.then(() => {
      const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
      computeAllLayouts(store.graph, pageId)
      store.requestRender()
    })
    const pageId = store.graph.getPages()[0]?.id ?? store.graph.rootId
    await store.switchPage(pageId)
    await store.fitCurrentPageToViewport()
  } finally {
    store.state.loading = false
  }
}

export function tabCount(): number {
  return activeTabRef.value ? 1 : 0
}

export function useTabsStore() {
  return {
    tabs: allTabs,
    activeTabId: computed(() => activeTabRef.value?.id ?? ''),
    createTab,
    switchTab,
    closeTab,
    openFileInNewTab,
    getActiveStore,
    tabCount,
    resetAllTabs
  }
}
